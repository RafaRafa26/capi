// Aritmética monetária em centavos inteiros (ARQUITETURA.md AD-07).
//
// Regra que governa este arquivo: nenhum valor monetário vira ponto flutuante
// em nenhum momento. Percentual é representado em base 10.000 (1% = 100) para
// que rateio percentual também seja aritmética inteira.

export const BASE_PERCENTUAL = 10_000; // 100,00% = 10.000

export class ErroDinheiro extends Error {}

/** Converte "1.234,56" ou "1234.56" para 123456 centavos. */
export function paraCentavos(entrada: string | number): number {
  if (typeof entrada === "number") {
    if (!Number.isFinite(entrada)) throw new ErroDinheiro("Valor não numérico");
    return Math.round(entrada * 100);
  }

  const limpo = entrada.trim().replace(/[R$\s ]/g, "");
  if (limpo === "") return 0;

  // Formato pt-BR ("1.234,56") vs. formato ponto ("1234.56"): a vírgula, quando
  // existe, é sempre o separador decimal.
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) {
    throw new ErroDinheiro(`Valor monetário inválido: ${entrada}`);
  }
  return Math.round(numero * 100);
}

/**
 * Divide `total` centavos entre `pesos`, sem perder nem inventar centavo.
 *
 * O resíduo da divisão vai para a ÚLTIMA posição (AD-07), garantindo que a
 * soma do resultado seja exatamente `total`. Pesos podem ser percentuais em
 * base 10.000 ou valores absolutos — o que importa é a proporção entre eles.
 */
export function ratear(total: number, pesos: number[]): number[] {
  exigirInteiro(total, "total");
  if (pesos.length === 0) throw new ErroDinheiro("Rateio sem destinos");
  if (pesos.some((p) => p < 0)) throw new ErroDinheiro("Peso negativo no rateio");

  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  if (somaPesos === 0) throw new ErroDinheiro("Soma dos pesos é zero");

  // Trunca cada fatia e acumula; a última recebe o que sobrou.
  const fatias = pesos.map((peso) => Math.trunc((total * peso) / somaPesos));
  const distribuido = fatias.slice(0, -1).reduce((a, b) => a + b, 0);
  fatias[fatias.length - 1] = total - distribuido;

  return fatias;
}

/**
 * Resolve as destinações de um lançamento em valores concretos (RN-04).
 *
 * `PERCENTUAL` é aplicado sobre `valor`; `VALOR_FIXO` entra como está. Quando
 * há apenas percentuais, o resíduo cai na última linha para fechar exato.
 */
export function resolverDestinacoes(
  valor: number,
  linhas: { modo: "PERCENTUAL" | "VALOR_FIXO"; valor: number }[],
): number[] {
  exigirInteiro(valor, "valor");
  if (linhas.length === 0) throw new ErroDinheiro("Lançamento sem destinação");

  const todasPercentuais = linhas.every((l) => l.modo === "PERCENTUAL");
  if (todasPercentuais) {
    return ratear(
      valor,
      linhas.map((l) => l.valor),
    );
  }

  const todasFixas = linhas.every((l) => l.modo === "VALOR_FIXO");
  if (todasFixas) {
    return linhas.map((l) => l.valor);
  }

  // Misto: os fixos são honrados primeiro; os percentuais rateiam o restante.
  const somaFixos = linhas
    .filter((l) => l.modo === "VALOR_FIXO")
    .reduce((a, l) => a + l.valor, 0);
  const restante = valor - somaFixos;
  if (restante < 0) {
    throw new ErroDinheiro(
      "Destinações de valor fixo somam mais que o valor do lançamento",
    );
  }

  const indicesPercentuais = linhas
    .map((l, i) => (l.modo === "PERCENTUAL" ? i : -1))
    .filter((i) => i >= 0);
  const fatias = ratear(
    restante,
    indicesPercentuais.map((i) => linhas[i].valor),
  );

  const resultado = linhas.map((l) => (l.modo === "VALOR_FIXO" ? l.valor : 0));
  indicesPercentuais.forEach((indice, ordem) => {
    resultado[indice] = fatias[ordem];
  });
  return resultado;
}

/**
 * Valida a regra RN-04: as destinações precisam cobrir exatamente 100% do
 * valor. Retorna a lista de problemas — vazia quando está tudo certo.
 */
export function validarDestinacoes(
  valor: number,
  linhas: { modo: "PERCENTUAL" | "VALOR_FIXO"; valor: number }[],
): string[] {
  const problemas: string[] = [];
  if (linhas.length === 0) {
    problemas.push("Um recebimento precisa de ao menos uma destinação.");
    return problemas;
  }

  if (linhas.some((l) => l.valor < 0)) {
    problemas.push("Destinação com valor negativo.");
  }

  const somaPercentuais = linhas
    .filter((l) => l.modo === "PERCENTUAL")
    .reduce((a, l) => a + l.valor, 0);
  const somaFixos = linhas
    .filter((l) => l.modo === "VALOR_FIXO")
    .reduce((a, l) => a + l.valor, 0);

  const temPercentual = linhas.some((l) => l.modo === "PERCENTUAL");
  const temFixo = linhas.some((l) => l.modo === "VALOR_FIXO");

  if (temPercentual && !temFixo && somaPercentuais !== BASE_PERCENTUAL) {
    problemas.push(
      `As destinações somam ${formatarPercentual(somaPercentuais)}; precisam somar 100%.`,
    );
  }

  if (temFixo && !temPercentual && somaFixos !== valor) {
    problemas.push(
      `As destinações somam ${formatarReais(somaFixos)}; precisam somar ${formatarReais(valor)}.`,
    );
  }

  if (temFixo && temPercentual) {
    if (somaFixos > valor) {
      problemas.push(
        "As destinações de valor fixo somam mais que o valor do lançamento.",
      );
    } else if (somaPercentuais !== BASE_PERCENTUAL) {
      problemas.push(
        `Os percentuais somam ${formatarPercentual(somaPercentuais)}; precisam somar 100% do valor restante.`,
      );
    }
  }

  return problemas;
}

function exigirInteiro(valor: number, nome: string) {
  if (!Number.isInteger(valor)) {
    throw new ErroDinheiro(`${nome} precisa ser inteiro em centavos: ${valor}`);
  }
}

function formatarPercentual(base10000: number) {
  return `${(base10000 / 100).toFixed(2).replace(".", ",")}%`;
}

function formatarReais(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}
