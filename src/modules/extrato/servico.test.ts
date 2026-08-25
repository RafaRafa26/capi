import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { comOrganizacao } from "@/db/client";
import {
  criarOrganizacaoDeTeste,
  removerOrganizacoesDeTeste,
  type OrgDeTeste,
} from "@/db/__testes__/ambiente";
import { ErroDeNegocio } from "@/shared/erros";
import { extratoDaConta, importarOfx, transacoesPendentes } from "./servico";

const OFX = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKTRANLIST>
<DTSTART>20260801
<DTEND>20260831
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260805
<TRNAMT>9812.40
<FITID>TX0001
<MEMO>TED RECEB JOAO
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260807
<TRNAMT>-4230.00
<FITID>TX0002
<MEMO>PAGAMENTO FORNECEDOR
</STMTTRN>
</BANKTRANLIST>
</OFX>`;

let orgA: OrgDeTeste;
let orgB: OrgDeTeste;

beforeAll(async () => {
  orgA = await criarOrganizacaoDeTeste("Extrato A");
  orgB = await criarOrganizacaoDeTeste("Extrato B");
});

afterAll(async () => {
  await removerOrganizacoesDeTeste([orgA.id, orgB.id]);
});

describe("importação de OFX", () => {
  it("importa as transações do arquivo", async () => {
    const r = await importarOfx(
      orgA.id,
      orgA.usuarioId,
      orgA.contaPropriaId,
      "agosto.ofx",
      OFX,
    );

    expect(r.lidas).toBe(2);
    expect(r.importadas).toBe(2);
    expect(r.duplicadas).toBe(0);
    expect(r.periodoInicio).toBe("2026-08-01");
    expect(r.periodoFim).toBe("2026-08-31");
  });

  it("reimportar o mesmo arquivo não duplica nada — RN-16 e critério da Fase 5", async () => {
    const r = await importarOfx(
      orgA.id,
      orgA.usuarioId,
      orgA.contaPropriaId,
      "agosto.ofx",
      OFX,
    );

    expect(r.lidas).toBe(2);
    expect(r.importadas).toBe(0);
    expect(r.duplicadas).toBe(2);

    const total = await comOrganizacao(orgA.id, (tx) =>
      tx.transacaoBancaria.count({ where: { contaBancariaId: orgA.contaPropriaId } }),
    );
    expect(total).toBe(2);
  });

  it("o mesmo FITID em OUTRA conta é transação diferente", async () => {
    // A unicidade é por (conta, FITID): bancos distintos podem repetir id.
    const r = await importarOfx(
      orgB.id,
      orgB.usuarioId,
      orgB.contaPropriaId,
      "agosto.ofx",
      OFX,
    );
    expect(r.importadas).toBe(2);
  });

  it("recusa importar em conta de terceiro — RN-21", async () => {
    await expect(
      importarOfx(orgA.id, orgA.usuarioId, orgA.contaTerceiroId, "x.ofx", OFX),
    ).rejects.toThrow(ErroDeNegocio);
  });

  it("recusa arquivo sem transação", async () => {
    await expect(
      importarOfx(
        orgA.id,
        orgA.usuarioId,
        orgA.contaPropriaId,
        "vazio.ofx",
        "<OFX></OFX>",
      ),
    ).rejects.toThrow(ErroDeNegocio);
  });
});

describe("isolamento entre organizações (AD-02)", () => {
  it("uma organização não enxerga transação da outra", async () => {
    const daA = await transacoesPendentes(orgA.id);
    const daB = await transacoesPendentes(orgB.id);

    expect(daA).toHaveLength(2);
    expect(daB).toHaveLength(2);

    const idsA = new Set(daA.map((t) => t.id));
    const idsB = new Set(daB.map((t) => t.id));
    for (const id of idsB) expect(idsA.has(id)).toBe(false);
  });

  it("consultar conta da outra organização não retorna nada", async () => {
    // Mesmo passando um id válido, o RLS filtra: a conta é de outra org.
    await expect(extratoDaConta(orgA.id, orgB.contaPropriaId)).rejects.toThrow();
  });
});

describe("extrato com saldo corrente", () => {
  it("acumula o saldo a partir do saldo inicial da conta", async () => {
    const { linhas, saldoInicial, saldoFinal } = await extratoDaConta(
      orgA.id,
      orgA.contaPropriaId,
    );

    expect(saldoInicial).toBe(0);
    expect(linhas).toHaveLength(2);
    expect(linhas[0].valor).toBe(981240);
    expect(linhas[0].saldo).toBe(981240);
    expect(linhas[1].valor).toBe(-423000);
    expect(linhas[1].saldo).toBe(981240 - 423000);
    expect(saldoFinal).toBe(558240);
  });

  it("as linhas vêm em ordem cronológica", async () => {
    const { linhas } = await extratoDaConta(orgA.id, orgA.contaPropriaId);
    const datas = linhas.map((l) => l.data);
    expect(datas).toEqual([...datas].sort());
  });
});
