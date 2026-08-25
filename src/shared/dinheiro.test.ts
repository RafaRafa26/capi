import { describe, expect, it } from "vitest";

import {
  BASE_PERCENTUAL,
  ErroDinheiro,
  paraCentavos,
  ratear,
  resolverDestinacoes,
  validarDestinacoes,
} from "./dinheiro";

describe("paraCentavos", () => {
  it("lê o formato pt-BR com milhar e decimal", () => {
    expect(paraCentavos("1.234,56")).toBe(123456);
    expect(paraCentavos("10.000,00")).toBe(1000000);
    expect(paraCentavos("R$ 1.234,56")).toBe(123456);
  });

  it("lê o formato com ponto decimal", () => {
    expect(paraCentavos("1234.56")).toBe(123456);
    expect(paraCentavos(1234.56)).toBe(123456);
  });

  it("trata vazio como zero e recusa lixo", () => {
    expect(paraCentavos("")).toBe(0);
    expect(() => paraCentavos("abc")).toThrow(ErroDinheiro);
  });

  it("não perde centavo no arredondamento binário", () => {
    // 0.1 + 0.2 !== 0.3 em ponto flutuante; aqui não pode vazar.
    expect(paraCentavos("0,10") + paraCentavos("0,20")).toBe(30);
    expect(paraCentavos(19.99)).toBe(1999);
    expect(paraCentavos(0.29)).toBe(29);
  });
});

describe("ratear — resíduo vai para a última posição (AD-07)", () => {
  it("divide exato quando não há resíduo", () => {
    expect(ratear(10000, [6000, 4000])).toEqual([6000, 4000]);
  });

  it("soma sempre bate com o total, mesmo com resíduo", () => {
    // R$ 100,00 em três partes iguais: 33,33 + 33,33 + 33,34
    const fatias = ratear(10000, [1, 1, 1]);
    expect(fatias).toEqual([3333, 3333, 3334]);
    expect(fatias.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("mantém a soma exata numa varredura de valores e proporções", () => {
    const proporcoes = [
      [1, 1, 1],
      [7000, 3000],
      [3333, 3333, 3334],
      [1, 2, 3, 5, 8, 13],
      [9999, 1],
    ];
    for (const pesos of proporcoes) {
      for (let total = 0; total <= 2000; total += 7) {
        const fatias = ratear(total, pesos);
        expect(fatias.reduce((a, b) => a + b, 0)).toBe(total);
      }
    }
  });

  it("aceita total zero", () => {
    expect(ratear(0, [6000, 4000])).toEqual([0, 0]);
  });

  it("recusa entrada inválida", () => {
    expect(() => ratear(100.5, [1])).toThrow(ErroDinheiro);
    expect(() => ratear(100, [])).toThrow(ErroDinheiro);
    expect(() => ratear(100, [0, 0])).toThrow(ErroDinheiro);
    expect(() => ratear(100, [-1, 2])).toThrow(ErroDinheiro);
  });
});

describe("resolverDestinacoes (RN-04)", () => {
  it("60/40 de R$ 10.000 fecha exato — critério de pronto da Fase 4", () => {
    const fatias = resolverDestinacoes(1000000, [
      { modo: "PERCENTUAL", valor: 6000 },
      { modo: "PERCENTUAL", valor: 4000 },
    ]);
    expect(fatias).toEqual([600000, 400000]);
    expect(fatias.reduce((a, b) => a + b, 0)).toBe(1000000);
  });

  it("percentual com resíduo de centavo não perde dinheiro", () => {
    const valor = 100001; // R$ 1.000,01
    const fatias = resolverDestinacoes(valor, [
      { modo: "PERCENTUAL", valor: 3333 },
      { modo: "PERCENTUAL", valor: 3333 },
      { modo: "PERCENTUAL", valor: 3334 },
    ]);
    expect(fatias.reduce((a, b) => a + b, 0)).toBe(valor);
  });

  it("valores fixos entram como estão", () => {
    expect(
      resolverDestinacoes(10000, [
        { modo: "VALOR_FIXO", valor: 7000 },
        { modo: "VALOR_FIXO", valor: 3000 },
      ]),
    ).toEqual([7000, 3000]);
  });

  it("misto: fixo é honrado primeiro, percentual rateia o resto", () => {
    const fatias = resolverDestinacoes(10000, [
      { modo: "VALOR_FIXO", valor: 1000 },
      { modo: "PERCENTUAL", valor: 5000 },
      { modo: "PERCENTUAL", valor: 5000 },
    ]);
    expect(fatias).toEqual([1000, 4500, 4500]);
    expect(fatias.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("recusa fixo maior que o valor do lançamento", () => {
    expect(() =>
      resolverDestinacoes(1000, [
        { modo: "VALOR_FIXO", valor: 2000 },
        { modo: "PERCENTUAL", valor: 10000 },
      ]),
    ).toThrow(ErroDinheiro);
  });
});

describe("validarDestinacoes (RN-04)", () => {
  it("aprova percentuais que somam 100%", () => {
    expect(
      validarDestinacoes(1000000, [
        { modo: "PERCENTUAL", valor: 6000 },
        { modo: "PERCENTUAL", valor: 4000 },
      ]),
    ).toEqual([]);
  });

  it("reprova percentuais que não fecham 100%", () => {
    const problemas = validarDestinacoes(1000000, [
      { modo: "PERCENTUAL", valor: 6000 },
      { modo: "PERCENTUAL", valor: 3000 },
    ]);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("90,00%");
  });

  it("aprova valores fixos que somam o total", () => {
    expect(
      validarDestinacoes(10000, [
        { modo: "VALOR_FIXO", valor: 6000 },
        { modo: "VALOR_FIXO", valor: 4000 },
      ]),
    ).toEqual([]);
  });

  it("reprova valores fixos que não somam o total", () => {
    expect(
      validarDestinacoes(10000, [{ modo: "VALOR_FIXO", valor: 9000 }]),
    ).toHaveLength(1);
  });

  it("reprova lançamento sem destinação", () => {
    expect(validarDestinacoes(10000, [])).toHaveLength(1);
  });

  it("100% equivale à base 10.000", () => {
    expect(
      validarDestinacoes(500, [{ modo: "PERCENTUAL", valor: BASE_PERCENTUAL }]),
    ).toEqual([]);
  });
});
