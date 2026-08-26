import { describe, expect, it } from "vitest";

import { parearTransacoes, sugerirLancamento } from "./dominio";

const candidato = (
  id: string,
  tipo: "RECEBIMENTO" | "PAGAMENTO",
  emAberto: number,
  vencimento = "2026-08-10",
) => ({ id, tipo, emAberto, vencimento });

describe("sugerirLancamento", () => {
  const entrada = { id: "t1", data: "2026-08-10", valor: 1245000 };
  const saida = { id: "t2", data: "2026-08-10", valor: -423000 };

  it("casa entrada do extrato com recebimento de mesmo valor", () => {
    const alvo = candidato("l1", "RECEBIMENTO", 1245000);
    expect(sugerirLancamento(entrada, [alvo])?.id).toBe("l1");
  });

  it("casa saída do extrato com pagamento de mesmo valor", () => {
    const alvo = candidato("l2", "PAGAMENTO", 423000);
    expect(sugerirLancamento(saida, [alvo])?.id).toBe("l2");
  });

  it("nunca cruza entrada com pagamento — inverteria o sinal da custódia", () => {
    const pagamento = candidato("l3", "PAGAMENTO", 1245000);
    expect(sugerirLancamento(entrada, [pagamento])).toBeNull();
  });

  it("não sugere valor aproximado — só exato", () => {
    const quase = candidato("l4", "RECEBIMENTO", 1245001);
    expect(sugerirLancamento(entrada, [quase])).toBeNull();
  });

  it("entre valores iguais, escolhe o vencimento mais próximo", () => {
    const longe = candidato("l5", "RECEBIMENTO", 1245000, "2026-09-20");
    const perto = candidato("l6", "RECEBIMENTO", 1245000, "2026-08-12");
    expect(sugerirLancamento(entrada, [longe, perto])?.id).toBe("l6");
  });

  it("ignora lançamento já reservado por outra transação", () => {
    const unico = candidato("l7", "RECEBIMENTO", 1245000);
    expect(sugerirLancamento(entrada, [unico], new Set(["l7"]))).toBeNull();
  });

  it("sem candidato, devolve null em vez de chutar", () => {
    expect(sugerirLancamento(entrada, [])).toBeNull();
  });
});

describe("parearTransacoes", () => {
  it("não propõe o mesmo lançamento para duas transações iguais", () => {
    const transacoes = [
      { id: "t1", data: "2026-08-10", valor: 100000 },
      { id: "t2", data: "2026-08-11", valor: 100000 },
    ];
    const candidatos = [
      candidato("l1", "RECEBIMENTO", 100000, "2026-08-10"),
      candidato("l2", "RECEBIMENTO", 100000, "2026-08-11"),
    ];

    const pares = parearTransacoes(transacoes, candidatos);
    const sugeridos = pares.map((p) => p.sugestao?.id);

    expect(new Set(sugeridos).size).toBe(2);
    expect(sugeridos).toEqual(["l1", "l2"]);
  });

  it("sobra sem sugestão quando há mais transações que lançamentos", () => {
    const transacoes = [
      { id: "t1", data: "2026-08-10", valor: 100000 },
      { id: "t2", data: "2026-08-11", valor: 100000 },
    ];
    const candidatos = [candidato("l1", "RECEBIMENTO", 100000)];

    const pares = parearTransacoes(transacoes, candidatos);
    expect(pares[0].sugestao?.id).toBe("l1");
    expect(pares[1].sugestao).toBeNull();
  });

  it("preserva a ordem e o total de transações", () => {
    const transacoes = [
      { id: "t1", data: "2026-08-10", valor: 100000 },
      { id: "t2", data: "2026-08-11", valor: -50000 },
      { id: "t3", data: "2026-08-12", valor: 700 },
    ];
    const pares = parearTransacoes(transacoes, []);
    expect(pares.map((p) => p.transacao.id)).toEqual(["t1", "t2", "t3"]);
    expect(pares.every((p) => p.sugestao === null)).toBe(true);
  });
});
