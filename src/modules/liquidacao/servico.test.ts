import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { comOrganizacao } from "@/db/client";
import {
  criarOrganizacaoDeTeste,
  removerOrganizacoesDeTeste,
  type OrgDeTeste,
} from "@/db/__testes__/ambiente";
import {
  conferenciaCaixaCustodia,
  posicaoDosFavorecidos,
  saldoDisponivel,
} from "@/modules/custodia/servico";
import { criarLancamento, gerarRepasse } from "@/modules/lancamentos/servico";
import { ErroDeNegocio } from "@/shared/erros";
import { conciliar, darBaixaManual, desfazerLiquidacao } from "./servico";

let org: OrgDeTeste;

beforeAll(async () => {
  org = await criarOrganizacaoDeTeste("Liquidacao");
});

afterAll(async () => {
  await removerOrganizacoesDeTeste([org.id]);
});

/** Cria uma transação de extrato direto, sem passar por arquivo OFX. */
async function criarTransacao(valor: number, descricao = "TESTE", data = "2026-08-05") {
  return comOrganizacao(org.id, (tx) =>
    tx.transacaoBancaria.create({
      data: {
        organizacaoId: org.id,
        contaBancariaId: org.contaPropriaId,
        identificadorBanco: `FIT-${Math.random().toString(36).slice(2)}`,
        data: new Date(`${data}T00:00:00Z`),
        valor,
        descricao,
      },
      select: { id: true },
    }),
  );
}

async function criarRecebimento(
  valor: number,
  destinacoes: { favorecidoId: string; modo: "PERCENTUAL" | "VALOR_FIXO"; valor: number }[],
) {
  return criarLancamento(org.id, {
    tipo: "RECEBIMENTO",
    contatoId: org.pagadorId,
    categoriaId: org.categoriaReceitaId,
    vencimento: "2026-08-05",
    valorPrevisto: valor,
    destinacoes,
    descricao: "Parcela de teste",
  });
}

describe("RN-01 e RN-04 — conciliação de recebimento credita a custódia", () => {
  it("credita os favorecidos conforme as destinações", async () => {
    const lanc = await criarRecebimento(1000000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 6000 },
      { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 4000 },
    ]);
    const transacao = await criarTransacao(1000000);

    await conciliar(org.id, org.usuarioId, transacao.id, [
      { lancamentoId: lanc.id, valor: 1000000 },
    ]);

    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(600000);
    expect(await saldoDisponivel(org.id, org.favorecidoBId)).toBe(400000);

    const atualizado = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atualizado?.status).toBe("LIQUIDADO");
    expect(atualizado?.valorLiquidado).toBe(1000000);
  });

  it("lançamento apenas PREVISTO não gera saldo nenhum", async () => {
    const antes = await saldoDisponivel(org.id, org.favorecidoAId);
    await criarRecebimento(500000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antes);
  });
});

describe("RN-02 e RN-03 — juros e multa compõem o crédito", () => {
  it("credita o valor efetivamente recebido, não o previsto", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    // O banco creditou R$ 1.050,00: R$ 1.000 previstos + R$ 50 de juros.
    const transacao = await criarTransacao(105000);
    const antes = await saldoDisponivel(org.id, org.favorecidoAId);

    await conciliar(org.id, org.usuarioId, transacao.id, [
      { lancamentoId: lanc.id, valor: 105000, juros: 5000 },
    ]);

    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antes + 105000);

    const atualizado = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atualizado?.status).toBe("LIQUIDADO");
    expect(atualizado?.juros).toBe(5000);
  });
});

describe("RN-06 — recebimento parcial", () => {
  it("deixa o lançamento PARCIAL e permite nova conciliação depois", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);

    const t1 = await criarTransacao(40000);
    await conciliar(org.id, org.usuarioId, t1.id, [
      { lancamentoId: lanc.id, valor: 40000 },
    ]);

    let atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("PARCIAL");
    expect(atual?.valorLiquidado).toBe(40000);

    const t2 = await criarTransacao(60000);
    await conciliar(org.id, org.usuarioId, t2.id, [
      { lancamentoId: lanc.id, valor: 60000 },
    ]);

    atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("LIQUIDADO");
    expect(atual?.valorLiquidado).toBe(100000);
  });

  it("recusa liquidar acima do valor devido", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const transacao = await criarTransacao(150000);

    await expect(
      conciliar(org.id, org.usuarioId, transacao.id, [
        { lancamentoId: lanc.id, valor: 150000 },
      ]),
    ).rejects.toThrow(ErroDeNegocio);
  });
});

describe("RN-07 — uma transação quita várias parcelas", () => {
  it("concilia três parcelas de uma vez", async () => {
    const parcelas = [];
    for (let i = 0; i < 3; i++) {
      parcelas.push(
        await criarRecebimento(100000, [
          { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 10000 },
        ]),
      );
    }
    const transacao = await criarTransacao(300000);
    const antes = await saldoDisponivel(org.id, org.favorecidoBId);

    await conciliar(
      org.id,
      org.usuarioId,
      transacao.id,
      parcelas.map((p) => ({ lancamentoId: p.id, valor: 100000 })),
    );

    expect(await saldoDisponivel(org.id, org.favorecidoBId)).toBe(antes + 300000);

    const transacaoFinal = await comOrganizacao(org.id, (tx) =>
      tx.transacaoBancaria.findUnique({ where: { id: transacao.id } }),
    );
    expect(transacaoFinal?.status).toBe("CONCILIADA");
  });

  it("recusa conciliar mais do que a transação moveu", async () => {
    const lanc = await criarRecebimento(500000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const transacao = await criarTransacao(100000);

    await expect(
      conciliar(org.id, org.usuarioId, transacao.id, [
        { lancamentoId: lanc.id, valor: 500000 },
      ]),
    ).rejects.toThrow(/ultrapassa o valor da transação/);
  });
});

describe("RN-05 — rateio em recebimento parcial exige decisão do operador", () => {
  it("a proposta automática é proporcional e fecha exata", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 3333 },
      { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 6667 },
    ]);
    const transacao = await criarTransacao(33333);
    const antesA = await saldoDisponivel(org.id, org.favorecidoAId);
    const antesB = await saldoDisponivel(org.id, org.favorecidoBId);

    await conciliar(org.id, org.usuarioId, transacao.id, [
      { lancamentoId: lanc.id, valor: 33333 },
    ]);

    const depoisA = await saldoDisponivel(org.id, org.favorecidoAId);
    const depoisB = await saldoDisponivel(org.id, org.favorecidoBId);
    // Nenhum centavo a mais nem a menos que o valor recebido.
    expect(depoisA - antesA + (depoisB - antesB)).toBe(33333);
  });

  it("o rateio confirmado pelo operador tem precedência sobre a proposta", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 5000 },
      { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 5000 },
    ]);
    const transacao = await criarTransacao(50000);
    const antesA = await saldoDisponivel(org.id, org.favorecidoAId);
    const antesB = await saldoDisponivel(org.id, org.favorecidoBId);

    // Operador decidiu 100% para A neste recebimento parcial.
    await conciliar(
      org.id,
      org.usuarioId,
      transacao.id,
      [{ lancamentoId: lanc.id, valor: 50000 }],
      { [lanc.id]: [50000, 0] },
    );

    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antesA + 50000);
    expect(await saldoDisponivel(org.id, org.favorecidoBId)).toBe(antesB);
  });

  it("recusa rateio que não soma o valor conciliado", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 5000 },
      { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 5000 },
    ]);
    const transacao = await criarTransacao(50000);

    await expect(
      conciliar(
        org.id,
        org.usuarioId,
        transacao.id,
        [{ lancamentoId: lanc.id, valor: 50000 }],
        { [lanc.id]: [30000, 10000] },
      ),
    ).rejects.toThrow(/rateio soma/);
  });
});

describe("RN-01a, RN-20 e RN-21 — baixa manual NÃO gera custódia", () => {
  it("quita a parcela sem alterar o saldo de custódia", async () => {
    const lanc = await criarRecebimento(200000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const antes = await saldoDisponivel(org.id, org.favorecidoAId);

    await darBaixaManual(
      org.id,
      org.usuarioId,
      [{ lancamentoId: lanc.id, valor: 200000 }],
      "2026-08-10",
      org.contaTerceiroId,
      "Pago direto na conta do produtor",
    );

    const atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("LIQUIDADO");
    // A parcela foi quitada, mas o razão não se mexeu — critério da Fase 6.
    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antes);
  });

  it("recusa baixa manual apontando para conta própria — RN-21", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);

    await expect(
      darBaixaManual(
        org.id,
        org.usuarioId,
        [{ lancamentoId: lanc.id, valor: 100000 }],
        "2026-08-10",
        org.contaPropriaId,
      ),
    ).rejects.toThrow(/conta própria/);
  });

  it("aceita baixa manual sem conta (pagamento em espécie)", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);

    await darBaixaManual(
      org.id,
      org.usuarioId,
      [{ lancamentoId: lanc.id, valor: 100000 }],
      "2026-08-10",
      null,
    );

    const atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("LIQUIDADO");
  });
});

describe("RN-12 e RN-22 — desfazer devolve o lançamento ao estado anterior", () => {
  it("desfazer conciliação remove o crédito de custódia junto", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const transacao = await criarTransacao(100000);
    const antes = await saldoDisponivel(org.id, org.favorecidoAId);

    await conciliar(org.id, org.usuarioId, transacao.id, [
      { lancamentoId: lanc.id, valor: 100000 },
    ]);
    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antes + 100000);

    const liquidacao = await comOrganizacao(org.id, (tx) =>
      tx.liquidacao.findFirst({ where: { lancamentoId: lanc.id } }),
    );
    await desfazerLiquidacao(org.id, liquidacao!.id);

    // Saldo volta ao que era, lançamento volta a PREVISTO, transação a PENDENTE.
    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(antes);

    const atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("PREVISTO");
    expect(atual?.valorLiquidado).toBe(0);

    const t = await comOrganizacao(org.id, (tx) =>
      tx.transacaoBancaria.findUnique({ where: { id: transacao.id } }),
    );
    expect(t?.status).toBe("PENDENTE");
  });

  it("desfazer baixa manual devolve o lançamento sem mexer na custódia", async () => {
    const lanc = await criarRecebimento(100000, [
      { favorecidoId: org.favorecidoBId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const antes = await saldoDisponivel(org.id, org.favorecidoBId);

    await darBaixaManual(
      org.id,
      org.usuarioId,
      [{ lancamentoId: lanc.id, valor: 100000 }],
      "2026-08-10",
      null,
    );

    const liquidacao = await comOrganizacao(org.id, (tx) =>
      tx.liquidacao.findFirst({ where: { lancamentoId: lanc.id } }),
    );
    await desfazerLiquidacao(org.id, liquidacao!.id);

    const atual = await comOrganizacao(org.id, (tx) =>
      tx.lancamento.findUnique({ where: { id: lanc.id } }),
    );
    expect(atual?.status).toBe("PREVISTO");
    expect(await saldoDisponivel(org.id, org.favorecidoBId)).toBe(antes);
  });
});

describe("RN-09, RN-10 e RN-11 — repasses", () => {
  it("repasse pendente reserva o saldo", async () => {
    const disponivelAntes = await saldoDisponivel(org.id, org.favorecidoAId);
    expect(disponivelAntes).toBeGreaterThan(50000);

    await gerarRepasse(
      org.id,
      org.favorecidoAId,
      50000,
      "2026-08-20",
      org.categoriaDespesaId,
    );

    // Ainda não conciliado: não virou débito, mas já não está disponível.
    expect(await saldoDisponivel(org.id, org.favorecidoAId)).toBe(
      disponivelAntes - 50000,
    );

    const posicao = (await posicaoDosFavorecidos(org.id)).find(
      (p) => p.favorecidoId === org.favorecidoAId,
    );
    expect(posicao?.reservado).toBeGreaterThanOrEqual(50000);
  });

  it("recusa repasse acima do saldo disponível — RN-10", async () => {
    const disponivel = await saldoDisponivel(org.id, org.favorecidoAId);

    await expect(
      gerarRepasse(
        org.id,
        org.favorecidoAId,
        disponivel + 1,
        "2026-08-20",
        org.categoriaDespesaId,
      ),
    ).rejects.toThrow(/Saldo disponível/);
  });

  it("conciliar o repasse com uma saída vira débito de custódia — RN-08", async () => {
    const repasse = await gerarRepasse(
      org.id,
      org.favorecidoBId,
      30000,
      "2026-08-20",
      org.categoriaDespesaId,
    );
    const disponivelAntes = await saldoDisponivel(org.id, org.favorecidoBId);

    const saida = await criarTransacao(-30000, "REPASSE");
    await conciliar(org.id, org.usuarioId, saida.id, [
      { lancamentoId: repasse.id, valor: 30000 },
    ]);

    const posicao = (await posicaoDosFavorecidos(org.id)).find(
      (p) => p.favorecidoId === org.favorecidoBId,
    );
    expect(posicao?.debitos).toBeGreaterThanOrEqual(30000);
    // A reserva virou débito: o disponível não muda ao conciliar.
    expect(await saldoDisponivel(org.id, org.favorecidoBId)).toBe(disponivelAntes);
  });

  it("recusa conciliar recebimento contra transação de saída", async () => {
    const lanc = await criarRecebimento(10000, [
      { favorecidoId: org.favorecidoAId, modo: "PERCENTUAL", valor: 10000 },
    ]);
    const saida = await criarTransacao(-10000);

    await expect(
      conciliar(org.id, org.usuarioId, saida.id, [
        { lancamentoId: lanc.id, valor: 10000 },
      ]),
    ).rejects.toThrow(/transação de entrada/);
  });
});

describe("conferência caixa × custódia (§2)", () => {
  it("o saldo de custódia nunca ultrapassa o caixa das contas próprias", async () => {
    const c = await conferenciaCaixaCustodia(org.id);
    expect(c.dinheiroDaEmpresa).toBe(c.saldoCaixa - c.saldoCustodia);
    expect(c.confere).toBe(true);
  });
});
