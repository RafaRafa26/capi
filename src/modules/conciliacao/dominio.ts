// Regras puras de pareamento entre extrato e lançamentos (ARQUITETURA §8.2).
//
// A tela de conciliação mostra cada transação do banco ao lado do lançamento
// que provavelmente a originou. Quem decide é sempre o operador — o sistema
// apenas PROPÕE, e só quando tem certeza razoável (mesmo espírito da RN-05).

export type TransacaoParaParear = {
  id: string;
  data: string;
  /** Sinal indica entrada (+) ou saída (−). */
  valor: number;
};

export type CandidatoParaParear = {
  id: string;
  tipo: "RECEBIMENTO" | "PAGAMENTO" | "TRANSFERENCIA";
  vencimento: string;
  /** Quanto ainda falta liquidar, em centavos. */
  emAberto: number;
};

/**
 * Escolhe o lançamento que melhor explica uma transação bancária.
 *
 * Critérios, nesta ordem:
 *   1. O tipo precisa bater — entrada do extrato só casa com recebimento,
 *      saída só com pagamento. Cruzar isso inverteria o sinal da custódia.
 *   2. O valor em aberto precisa ser EXATAMENTE o da transação. Sugerir um
 *      valor aproximado convidaria o operador a aprovar no automático uma
 *      conciliação errada — e conciliação errada corrompe o razão (RN-12).
 *   3. Entre empates, vence o vencimento mais próximo da data da transação.
 *
 * Sem candidato exato, devolve `null`: a linha aparece para o operador
 * resolver à mão, que é o comportamento correto.
 */
export function sugerirLancamento<T extends CandidatoParaParear>(
  transacao: TransacaoParaParear,
  candidatos: T[],
  jaUsados: ReadonlySet<string> = new Set(),
): T | null {
  const entrada = transacao.valor > 0;
  const tipoEsperado = entrada ? "RECEBIMENTO" : "PAGAMENTO";
  const valorAbsoluto = Math.abs(transacao.valor);

  const compativeis = candidatos.filter(
    (c) =>
      !jaUsados.has(c.id) &&
      c.tipo === tipoEsperado &&
      c.emAberto === valorAbsoluto,
  );

  if (compativeis.length === 0) return null;

  const diaDaTransacao = Date.parse(`${transacao.data}T00:00:00Z`);
  return compativeis.reduce((melhor, atual) => {
    const distancia = (c: T) =>
      Math.abs(Date.parse(`${c.vencimento}T00:00:00Z`) - diaDaTransacao);
    return distancia(atual) < distancia(melhor) ? atual : melhor;
  });
}

/**
 * Pareia a lista inteira, sem propor o mesmo lançamento para duas transações.
 *
 * Percorre em ordem cronológica e vai reservando: sem isso, duas parcelas de
 * mesmo valor receberiam a mesma sugestão e o operador aprovaria uma
 * conciliação impossível.
 */
export function parearTransacoes<
  Tr extends TransacaoParaParear,
  Ca extends CandidatoParaParear,
>(transacoes: Tr[], candidatos: Ca[]): { transacao: Tr; sugestao: Ca | null }[] {
  const usados = new Set<string>();

  return transacoes.map((transacao) => {
    const sugestao = sugerirLancamento(transacao, candidatos, usados);
    if (sugestao) usados.add(sugestao.id);
    return { transacao, sugestao };
  });
}
