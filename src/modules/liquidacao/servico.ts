import "server-only";

import { comOrganizacao, type Tx } from "@/db/client";
import { resolverDestinacoes } from "@/shared/dinheiro";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import { statusPorLiquidacao, valorDevido } from "@/modules/lancamentos/dominio";

// A única porta de entrada da custódia (RN-13). Conciliação de extrato e baixa
// manual são caminhos diferentes para o MESMO mecanismo: ambos gravam uma
// linha em `liquidacao`, e é dela que nasce — ou não — o movimento de custódia.
//
// Tudo aqui roda dentro de uma transação de banco (§8.3.2): conciliação
// gravada pela metade corrompe o razão, e razão corrompido com dinheiro de
// terceiros é o pior defeito possível deste sistema.

export type LinhaConciliacao = {
  lancamentoId: string;
  valor: number;
  juros?: number;
  multa?: number;
  desconto?: number;
};

/**
 * Concilia uma transação bancária com um ou mais lançamentos (RN-07, RN-08).
 *
 * Recebimento em conta própria credita a custódia dos favorecidos conforme as
 * destinações (RN-01, RN-04). Pagamento debita. Transferência e lançamento sem
 * destinação não mexem na custódia (RN-14, RN-15).
 */
export async function conciliar(
  organizacaoId: string,
  usuarioId: string,
  transacaoId: string,
  linhas: LinhaConciliacao[],
  rateioConfirmado?: Record<string, number[]>,
) {
  if (linhas.length === 0) {
    throw new ErroDeNegocio("Selecione ao menos um lançamento para conciliar.");
  }
  if (linhas.some((l) => l.valor <= 0)) {
    throw new ErroDeNegocio("Valor conciliado precisa ser maior que zero.");
  }

  return comOrganizacao(organizacaoId, async (tx) => {
    const transacao = await tx.transacaoBancaria.findUnique({
      where: { id: transacaoId },
      include: { liquidacoes: true, contaBancaria: true },
    });
    if (!transacao) throw new NaoEncontrado("Transação bancária");

    if (transacao.status === "CONCILIADA") {
      throw new ErroDeNegocio("Esta transação já foi conciliada.");
    }
    if (transacao.contaBancaria.natureza !== "PROPRIA") {
      throw new ErroDeNegocio(
        "Conciliação de extrato só existe em conta própria (RN-21).",
      );
    }

    const jaConciliado = transacao.liquidacoes.reduce(
      (soma, l) => soma + l.valorLiquidado,
      0,
    );
    const totalAgora = linhas.reduce((soma, l) => soma + l.valor, 0);
    const valorTransacao = Math.abs(transacao.valor);

    // Invariante do §5.2: não se pode conciliar mais do que a transação moveu.
    if (jaConciliado + totalAgora > valorTransacao) {
      throw new ErroDeNegocio(
        `A soma dos valores conciliados (${formatar(jaConciliado + totalAgora)}) ` +
          `ultrapassa o valor da transação (${formatar(valorTransacao)}).`,
      );
    }

    for (const linha of linhas) {
      await liquidarLancamento(tx, {
        organizacaoId,
        usuarioId,
        origem: "EXTRATO",
        transacaoId,
        contaBancariaId: transacao.contaBancariaId,
        dataLiquidacao: transacao.data,
        linha,
        rateioConfirmado: rateioConfirmado?.[linha.lancamentoId],
        entradaDeCaixa: transacao.valor > 0,
      });
    }

    // Só marca a transação como resolvida quando ela foi coberta por inteiro;
    // sobra fica pendente para uma segunda conciliação.
    const totalFinal = jaConciliado + totalAgora;
    if (totalFinal >= valorTransacao) {
      await tx.transacaoBancaria.update({
        where: { id: transacaoId },
        data: { status: "CONCILIADA" },
      });
    }

    return { conciliado: totalFinal, restante: valorTransacao - totalFinal };
  });
}

/**
 * Baixa manual (RN-20): quita a parcela sem transação bancária e sem tocar na
 * custódia (RN-01a) — o dinheiro foi direto para o favorecido, a organização
 * não recebeu nada e não tem o que repassar.
 */
export async function darBaixaManual(
  organizacaoId: string,
  usuarioId: string,
  linhas: LinhaConciliacao[],
  dataLiquidacao: string,
  contaBancariaId?: string | null,
  observacao?: string,
) {
  if (linhas.length === 0) {
    throw new ErroDeNegocio("Selecione ao menos uma parcela para dar baixa.");
  }
  if (linhas.some((l) => l.valor <= 0)) {
    throw new ErroDeNegocio("Valor da baixa precisa ser maior que zero.");
  }

  return comOrganizacao(organizacaoId, async (tx) => {
    if (contaBancariaId) {
      const conta = await tx.contaBancaria.findUnique({
        where: { id: contaBancariaId },
      });
      if (!conta) throw new NaoEncontrado("Conta bancária");

      // RN-21: dinheiro que entra em conta própria SEMPRE liquida por
      // conciliação. Aceitar baixa manual aqui geraria crédito duplicado
      // quando a mesma entrada aparecesse no OFX depois.
      if (conta.natureza === "PROPRIA") {
        throw new ErroDeNegocio(
          "Baixa manual não pode apontar para conta própria. Use a conciliação do extrato.",
        );
      }
    }

    for (const linha of linhas) {
      await liquidarLancamento(tx, {
        organizacaoId,
        usuarioId,
        origem: "BAIXA_MANUAL",
        transacaoId: null,
        contaBancariaId: contaBancariaId ?? null,
        dataLiquidacao: new Date(`${dataLiquidacao}T00:00:00Z`),
        linha,
        observacao,
        entradaDeCaixa: false,
      });
    }

    return { baixados: linhas.length };
  });
}

/**
 * Desfaz uma liquidação (RN-12, RN-22).
 *
 * Movimento de custódia não é editado nem apagado à mão: some junto com a
 * liquidação que o originou, por cascade, e o lançamento volta ao status que o
 * novo total liquidado determinar.
 */
export async function desfazerLiquidacao(organizacaoId: string, liquidacaoId: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const liquidacao = await tx.liquidacao.findUnique({
      where: { id: liquidacaoId },
      include: { lancamento: true },
    });
    if (!liquidacao) throw new NaoEncontrado("Liquidação");

    await tx.liquidacao.delete({ where: { id: liquidacaoId } });

    await recalcularLancamento(tx, liquidacao.lancamentoId);

    // A transação volta a ficar pendente: perdeu (parte da) cobertura.
    if (liquidacao.transacaoId) {
      await tx.transacaoBancaria.update({
        where: { id: liquidacao.transacaoId },
        data: { status: "PENDENTE" },
      });
    }

    return { lancamentoId: liquidacao.lancamentoId };
  });
}

// ------------------------------------------------------------------ interno

type ContextoLiquidacao = {
  organizacaoId: string;
  usuarioId: string;
  origem: "EXTRATO" | "BAIXA_MANUAL";
  transacaoId: string | null;
  contaBancariaId: string | null;
  dataLiquidacao: Date;
  linha: LinhaConciliacao;
  rateioConfirmado?: number[];
  observacao?: string;
  entradaDeCaixa: boolean;
};

async function liquidarLancamento(tx: Tx, ctx: ContextoLiquidacao) {
  const lancamento = await tx.lancamento.findUnique({
    where: { id: ctx.linha.lancamentoId },
    include: {
      destinacoes: { orderBy: { ordem: "asc" } },
      liquidacoes: true,
    },
  });
  if (!lancamento) throw new NaoEncontrado("Lançamento");

  if (lancamento.status === "CANCELADO") {
    throw new ErroDeNegocio("Lançamento cancelado não pode ser liquidado.");
  }

  // Juros/multa/desconto informados na tela de conciliação passam a fazer
  // parte do lançamento (RN-03) e entram no cálculo do que ainda falta.
  const juros = ctx.linha.juros ?? lancamento.juros;
  const multa = ctx.linha.multa ?? lancamento.multa;
  const desconto = ctx.linha.desconto ?? lancamento.desconto;
  const valores = { valorPrevisto: lancamento.valorPrevisto, juros, multa, desconto };

  const liquidadoAntes = lancamento.liquidacoes.reduce(
    (soma, l) => soma + l.valorLiquidado,
    0,
  );
  const totalLiquidado = liquidadoAntes + ctx.linha.valor;

  if (totalLiquidado > valorDevido(valores)) {
    throw new ErroDeNegocio(
      `O valor liquidado (${formatar(totalLiquidado)}) ultrapassa o devido do lançamento ` +
        `(${formatar(valorDevido(valores))}). Ajuste juros, multa ou desconto.`,
    );
  }

  const liquidacao = await tx.liquidacao.create({
    data: {
      organizacaoId: ctx.organizacaoId,
      origem: ctx.origem,
      transacaoId: ctx.transacaoId,
      contaBancariaId: ctx.contaBancariaId,
      lancamentoId: lancamento.id,
      valorLiquidado: ctx.linha.valor,
      dataLiquidacao: ctx.dataLiquidacao,
      observacao: ctx.observacao,
      usuarioId: ctx.usuarioId,
    },
  });

  await tx.lancamento.update({
    where: { id: lancamento.id },
    data: {
      juros,
      multa,
      desconto,
      valorLiquidado: totalLiquidado,
      status: statusPorLiquidacao(valores, totalLiquidado),
    },
  });

  // RN-01a e RN-14: só conciliação de extrato gera custódia. Baixa manual,
  // transferência e lançamento sem destinação, não.
  if (ctx.origem !== "EXTRATO") return liquidacao;
  if (lancamento.tipo === "TRANSFERENCIA") return liquidacao;
  if (lancamento.destinacoes.length === 0) return liquidacao;

  if (lancamento.tipo === "RECEBIMENTO") {
    if (!ctx.entradaDeCaixa) {
      throw new ErroDeNegocio(
        "Um recebimento só pode ser conciliado com uma transação de entrada.",
      );
    }

    // RN-05: em recebimento parcial o sistema PROPÕE a divisão proporcional,
    // mas quem decide é o operador — por isso o rateio confirmado, quando
    // vem, tem precedência sobre o cálculo automático.
    const fatias =
      ctx.rateioConfirmado ??
      resolverDestinacoes(
        ctx.linha.valor,
        lancamento.destinacoes.map((d) => ({ modo: d.modo, valor: d.valor })),
      );

    if (fatias.length !== lancamento.destinacoes.length) {
      throw new ErroDeNegocio(
        "O rateio informado não corresponde às destinações do lançamento.",
      );
    }
    const somaFatias = fatias.reduce((a, b) => a + b, 0);
    if (somaFatias !== ctx.linha.valor) {
      throw new ErroDeNegocio(
        `O rateio soma ${formatar(somaFatias)}, mas o valor conciliado é ${formatar(ctx.linha.valor)}.`,
      );
    }

    for (let i = 0; i < lancamento.destinacoes.length; i++) {
      if (fatias[i] === 0) continue;
      await tx.movimentoCustodia.create({
        data: {
          organizacaoId: ctx.organizacaoId,
          favorecidoId: lancamento.destinacoes[i].favorecidoId,
          liquidacaoId: liquidacao.id,
          tipo: "CREDITO",
          valor: fatias[i],
          data: ctx.dataLiquidacao,
        },
      });
    }
  }

  if (lancamento.tipo === "PAGAMENTO") {
    if (ctx.entradaDeCaixa) {
      throw new ErroDeNegocio(
        "Um pagamento só pode ser conciliado com uma transação de saída.",
      );
    }

    // Repasse: debita o favorecido do lançamento.
    for (const destinacao of lancamento.destinacoes) {
      await tx.movimentoCustodia.create({
        data: {
          organizacaoId: ctx.organizacaoId,
          favorecidoId: destinacao.favorecidoId,
          liquidacaoId: liquidacao.id,
          tipo: "DEBITO",
          valor: ctx.linha.valor,
          data: ctx.dataLiquidacao,
        },
      });
    }
  }

  return liquidacao;
}

/** Recalcula valor liquidado e status a partir das liquidações que restaram. */
async function recalcularLancamento(tx: Tx, lancamentoId: string) {
  const lancamento = await tx.lancamento.findUnique({
    where: { id: lancamentoId },
    include: { liquidacoes: true },
  });
  if (!lancamento) return;

  const total = lancamento.liquidacoes.reduce((s, l) => s + l.valorLiquidado, 0);
  const valores = {
    valorPrevisto: lancamento.valorPrevisto,
    juros: lancamento.juros,
    multa: lancamento.multa,
    desconto: lancamento.desconto,
  };

  await tx.lancamento.update({
    where: { id: lancamentoId },
    data: {
      valorLiquidado: total,
      status: statusPorLiquidacao(valores, total),
    },
  });
}

function formatar(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}
