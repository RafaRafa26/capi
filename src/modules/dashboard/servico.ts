import "server-only";

import { comOrganizacao } from "@/db/client";
import { situacaoPorVencimento } from "@/modules/lancamentos/dominio";

export type ResumoPorSituacao = {
  vencido: { quantidade: number; total: number };
  venceHoje: { quantidade: number; total: number };
  aVencer: { quantidade: number; total: number };
  total: number;
};

export type ResumoDashboard = {
  contas: { id: string; nome: string; banco: string; agencia: string; conta: string; saldo: number }[];
  saldoTotal: number;
  aReceber: ResumoPorSituacao;
  aPagar: ResumoPorSituacao;
};

/** Saldo de cada conta própria: saldo inicial + soma das transações. */
export async function resumoDoDashboard(
  organizacaoId: string,
  hoje = new Date(),
): Promise<ResumoDashboard> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const contas = await tx.contaBancaria.findMany({
      where: { natureza: "PROPRIA", ativa: true },
      select: {
        id: true,
        nome: true,
        banco: true,
        agencia: true,
        conta: true,
        saldoInicial: true,
      },
      orderBy: { nome: "asc" },
    });

    const movimentos = await tx.transacaoBancaria.groupBy({
      by: ["contaBancariaId"],
      _sum: { valor: true },
    });

    const contasComSaldo = contas.map((c) => ({
      id: c.id,
      nome: c.nome,
      banco: c.banco,
      agencia: c.agencia,
      conta: c.conta,
      saldo:
        c.saldoInicial +
        (movimentos.find((m) => m.contaBancariaId === c.id)?._sum.valor ?? 0),
    }));

    const emAberto = await tx.lancamento.findMany({
      where: { status: { in: ["PREVISTO", "PARCIAL"] } },
      select: {
        tipo: true,
        vencimento: true,
        status: true,
        valorPrevisto: true,
        juros: true,
        multa: true,
        desconto: true,
        valorLiquidado: true,
      },
    });

    const resumir = (tipo: "RECEBIMENTO" | "PAGAMENTO"): ResumoPorSituacao => {
      const vazio = { quantidade: 0, total: 0 };
      const resumo: ResumoPorSituacao = {
        vencido: { ...vazio },
        venceHoje: { ...vazio },
        aVencer: { ...vazio },
        total: 0,
      };

      for (const l of emAberto.filter((x) => x.tipo === tipo)) {
        const restante =
          l.valorPrevisto + l.juros + l.multa - l.desconto - l.valorLiquidado;
        if (restante <= 0) continue;

        const situacao = situacaoPorVencimento(l.status, l.vencimento, hoje);
        const alvo =
          situacao === "VENCIDO"
            ? resumo.vencido
            : situacao === "VENCE_HOJE"
              ? resumo.venceHoje
              : resumo.aVencer;

        alvo.quantidade += 1;
        alvo.total += restante;
        resumo.total += restante;
      }

      return resumo;
    };

    return {
      contas: contasComSaldo,
      saldoTotal: contasComSaldo.reduce((s, c) => s + c.saldo, 0),
      aReceber: resumir("RECEBIMENTO"),
      aPagar: resumir("PAGAMENTO"),
    };
  });
}

export type PontoFluxoCaixa = { date: string; entradas: number; saidas: number };

/**
 * Série diária de entradas e saídas das contas próprias, para o gráfico de
 * fluxo de caixa. Dias sem movimento entram zerados, para a linha não dar
 * saltos onde apenas não houve transação.
 */
export async function fluxoDeCaixaDiario(
  organizacaoId: string,
): Promise<PontoFluxoCaixa[]> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const transacoes = await tx.transacaoBancaria.findMany({
      where: { contaBancaria: { natureza: "PROPRIA" } },
      select: { data: true, valor: true },
      orderBy: { data: "asc" },
    });

    if (transacoes.length === 0) return [];

    const porDia = new Map<string, { entradas: number; saidas: number }>();
    for (const t of transacoes) {
      const dia = t.data.toISOString().slice(0, 10);
      const atual = porDia.get(dia) ?? { entradas: 0, saidas: 0 };
      if (t.valor >= 0) atual.entradas += t.valor;
      else atual.saidas += -t.valor;
      porDia.set(dia, atual);
    }

    const primeiro = new Date(`${transacoes[0].data.toISOString().slice(0, 10)}T00:00:00Z`);
    const ultimo = new Date(
      `${transacoes.at(-1)!.data.toISOString().slice(0, 10)}T00:00:00Z`,
    );

    const serie: PontoFluxoCaixa[] = [];
    for (const d = new Date(primeiro); d <= ultimo; d.setUTCDate(d.getUTCDate() + 1)) {
      const dia = d.toISOString().slice(0, 10);
      const valores = porDia.get(dia) ?? { entradas: 0, saidas: 0 };
      serie.push({ date: dia, ...valores });
    }

    return serie;
  });
}

export type MesRecebimento = {
  label: string;
  value: number;
  display: string;
  current?: boolean;
};

/**
 * Recebimentos conciliados por mês, últimos 12 meses.
 *
 * Conta só o que entrou de verdade em conta própria (liquidação de extrato) —
 * previsão não vira barra no gráfico.
 */
export async function recebimentosPorMes(
  organizacaoId: string,
  hoje = new Date(),
): Promise<MesRecebimento[]> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const inicio = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 11, 1),
    );

    const liquidacoes = await tx.liquidacao.findMany({
      where: {
        origem: "EXTRATO",
        dataLiquidacao: { gte: inicio },
        lancamento: { tipo: "RECEBIMENTO" },
      },
      select: { dataLiquidacao: true, valorLiquidado: true },
    });

    const porMes = new Map<string, number>();
    for (const l of liquidacoes) {
      const chave = l.dataLiquidacao.toISOString().slice(0, 7);
      porMes.set(chave, (porMes.get(chave) ?? 0) + l.valorLiquidado);
    }

    const meses: MesRecebimento[] = [];
    const mesAtual = hoje.toISOString().slice(0, 7);

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1));
      const chave = d.toISOString().slice(0, 7);
      const centavos = porMes.get(chave) ?? 0;
      const milhares = Math.round(centavos / 100_000);

      meses.push({
        label: d.toLocaleDateString("pt-BR", {
          month: "short",
          ...(d.getUTCMonth() === 0 || i === 11 ? { year: "2-digit" } : {}),
          timeZone: "UTC",
        }),
        value: milhares,
        display: `R$ ${milhares}k`,
        current: chave === mesAtual,
      });
    }

    return meses;
  });
}
