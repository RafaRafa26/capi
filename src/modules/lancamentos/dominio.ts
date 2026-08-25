// Regras puras de lançamento — sem banco, sem I/O (ARQUITETURA §8.2).

export type StatusLancamento = "PREVISTO" | "PARCIAL" | "LIQUIDADO" | "CANCELADO";

export type ValoresLancamento = {
  valorPrevisto: number;
  juros: number;
  multa: number;
  desconto: number;
};

/**
 * Quanto o lançamento vale depois dos acessórios.
 *
 * Juros e multa aumentam a dívida; desconto reduz. É contra este número — e
 * não contra o valor previsto original — que se decide se o lançamento está
 * quitado (RN-02, RN-03).
 */
export function valorDevido(v: ValoresLancamento): number {
  return v.valorPrevisto + v.juros + v.multa - v.desconto;
}

/**
 * Status decorrente do quanto já foi liquidado (RN-06).
 *
 * Liquidação a maior (o banco creditou mais do que o previsto) conta como
 * LIQUIDADO, não como erro: a diferença já foi tratada como juros/multa na
 * tela de conciliação, ou é uma sobra que o operador aceitou conscientemente.
 */
export function statusPorLiquidacao(
  v: ValoresLancamento,
  totalLiquidado: number,
): StatusLancamento {
  if (totalLiquidado <= 0) return "PREVISTO";
  return totalLiquidado >= valorDevido(v) ? "LIQUIDADO" : "PARCIAL";
}

/** Quanto ainda falta receber/pagar. Nunca negativo. */
export function saldoEmAberto(
  v: ValoresLancamento,
  totalLiquidado: number,
): number {
  return Math.max(0, valorDevido(v) - totalLiquidado);
}

export type SituacaoVencimento = "VENCIDO" | "VENCE_HOJE" | "A_VENCER" | "LIQUIDADO";

/**
 * Situação exibida nas listas de contas a receber/pagar.
 *
 * Compara só a parte da data, para que um vencimento "hoje" não vire
 * "vencido" por causa do horário.
 */
export function situacaoPorVencimento(
  status: StatusLancamento,
  vencimento: Date,
  hoje: Date,
): SituacaoVencimento {
  if (status === "LIQUIDADO") return "LIQUIDADO";

  const dia = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const diff = dia(vencimento) - dia(hoje);
  if (diff < 0) return "VENCIDO";
  if (diff === 0) return "VENCE_HOJE";
  return "A_VENCER";
}

/**
 * Confere se o total conciliado contra uma transação bancária cabe no valor
 * dela (invariante do §5.2, base das RN-07 e RN-08).
 */
export function cabeNaTransacao(
  valorTransacao: number,
  jaConciliado: number,
  novoValor: number,
): boolean {
  return jaConciliado + novoValor <= Math.abs(valorTransacao);
}
