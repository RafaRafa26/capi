import "server-only";

import { comOrganizacao } from "@/db/client";

// O razão de custódia é sempre DERIVADO (RN-13): nada aqui escreve, só soma
// o que as liquidações produziram.

export type PosicaoFavorecido = {
  favorecidoId: string;
  nome: string;
  documento: string;
  creditos: number;
  debitos: number;
  /** Repasses gerados e ainda não conciliados — reservam saldo (RN-09). */
  reservado: number;
  /** creditos − debitos − reservado (RN-09). */
  disponivel: number;
};

export async function posicaoDosFavorecidos(
  organizacaoId: string,
): Promise<PosicaoFavorecido[]> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const favorecidos = await tx.contato.findMany({
      where: { papeis: { has: "FAVORECIDO" } },
      select: { id: true, nome: true, documento: true },
      orderBy: { nome: "asc" },
    });

    const movimentos = await tx.movimentoCustodia.groupBy({
      by: ["favorecidoId", "tipo"],
      _sum: { valor: true },
    });

    // Repasse PENDENTE = lançamento de pagamento com destinação, ainda não
    // liquidado. O valor fica reservado para o mesmo saldo não ser repassado
    // duas vezes (RN-09).
    const pendentes = await tx.destinacao.findMany({
      where: {
        lancamento: {
          tipo: "PAGAMENTO",
          status: { in: ["PREVISTO", "PARCIAL"] },
        },
      },
      select: {
        favorecidoId: true,
        lancamento: {
          select: { valorPrevisto: true, valorLiquidado: true },
        },
      },
    });

    const reservaPorFavorecido = new Map<string, number>();
    for (const d of pendentes) {
      const emAberto = Math.max(
        0,
        d.lancamento.valorPrevisto - d.lancamento.valorLiquidado,
      );
      reservaPorFavorecido.set(
        d.favorecidoId,
        (reservaPorFavorecido.get(d.favorecidoId) ?? 0) + emAberto,
      );
    }

    const soma = (id: string, tipo: "CREDITO" | "DEBITO") =>
      movimentos.find((m) => m.favorecidoId === id && m.tipo === tipo)?._sum.valor ?? 0;

    return favorecidos.map((f) => {
      const creditos = soma(f.id, "CREDITO");
      const debitos = soma(f.id, "DEBITO");
      const reservado = reservaPorFavorecido.get(f.id) ?? 0;
      return {
        favorecidoId: f.id,
        nome: f.nome,
        documento: f.documento,
        creditos,
        debitos,
        reservado,
        disponivel: creditos - debitos - reservado,
      };
    });
  });
}

export async function saldoDisponivel(
  organizacaoId: string,
  favorecidoId: string,
): Promise<number> {
  const posicoes = await posicaoDosFavorecidos(organizacaoId);
  return posicoes.find((p) => p.favorecidoId === favorecidoId)?.disponivel ?? 0;
}

/** Extrato de custódia de um favorecido, do mais recente para o mais antigo. */
export async function extratoDeCustodia(
  organizacaoId: string,
  favorecidoId: string,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const movimentos = await tx.movimentoCustodia.findMany({
      where: { favorecidoId },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
      select: {
        id: true,
        tipo: true,
        valor: true,
        data: true,
        liquidacao: {
          select: {
            origem: true,
            lancamento: { select: { descricao: true, tipo: true } },
          },
        },
      },
    });

    return movimentos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      valor: m.valor,
      data: m.data.toISOString().slice(0, 10),
      origem: m.liquidacao.origem,
      descricao: m.liquidacao.lancamento.descricao ?? m.liquidacao.lancamento.tipo,
    }));
  });
}

/**
 * Conferência caixa × custódia (ARQUITETURA §2).
 *
 * Σ saldos das contas PRÓPRIAS − Σ saldos de custódia = dinheiro da empresa.
 * Número negativo significa erro de lançamento ou de conciliação: o sistema
 * estaria devendo mais do que tem em caixa.
 */
export async function conferenciaCaixaCustodia(organizacaoId: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const contas = await tx.contaBancaria.findMany({
      where: { natureza: "PROPRIA" },
      select: { id: true, saldoInicial: true },
    });

    const movimentoPorConta = await tx.transacaoBancaria.groupBy({
      by: ["contaBancariaId"],
      _sum: { valor: true },
    });

    const saldoCaixa = contas.reduce((total, conta) => {
      const movimento =
        movimentoPorConta.find((m) => m.contaBancariaId === conta.id)?._sum.valor ?? 0;
      return total + conta.saldoInicial + movimento;
    }, 0);

    const porTipo = await tx.movimentoCustodia.groupBy({
      by: ["tipo"],
      _sum: { valor: true },
    });
    const creditos = porTipo.find((m) => m.tipo === "CREDITO")?._sum.valor ?? 0;
    const debitos = porTipo.find((m) => m.tipo === "DEBITO")?._sum.valor ?? 0;
    const saldoCustodia = creditos - debitos;

    return {
      saldoCaixa,
      saldoCustodia,
      dinheiroDaEmpresa: saldoCaixa - saldoCustodia,
      confere: saldoCaixa - saldoCustodia >= 0,
    };
  });
}
