import { describe, expect, it } from "vitest";

import { ErroDeNegocio } from "@/shared/erros";
import { dataOfxParaISO, lerOfx, valorOfxParaCentavos } from "./ofx";

// OFX 1.x (SGML) — formato que Asaas, BB e Sicoob emitem.
const OFX_1X = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260801
<DTEND>20260831
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260805120000[-3:BRT]
<TRNAMT>9812.40
<FITID>TX0001
<MEMO>TED RECEB JOAO FRANCISCO SILVA
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260807
<TRNAMT>-4230.00
<FITID>TX0002
<MEMO>PAGAMENTO FORNECEDOR NF 3421
</STMTTRN>
<STMTTRN>
<TRNTYPE>FEE
<DTPOSTED>20260810
<TRNAMT>12.90
<FITID>TX0003
<MEMO>TARIFA MENSAL
</STMTTRN>
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>5569.50
<DTASOF>20260831
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

// OFX 2.x (XML) — mesmas transações, tags fechadas.
const OFX_2X = `<?xml version="1.0" encoding="UTF-8"?>
<?OFX OFXHEADER="200" VERSION="211"?>
<OFX>
  <BANKMSGSRSV1><STMTTRNRS><STMTRS>
    <CURDEF>BRL</CURDEF>
    <BANKACCTFROM><BANKID>341</BANKID><ACCTID>99887-7</ACCTID></BANKACCTFROM>
    <BANKTRANLIST>
      <DTSTART>20260801</DTSTART>
      <DTEND>20260831</DTEND>
      <STMTTRN>
        <TRNTYPE>CREDIT</TRNTYPE>
        <DTPOSTED>20260805</DTPOSTED>
        <TRNAMT>9812.40</TRNAMT>
        <FITID>TX0001</FITID>
        <MEMO>TED RECEB JOAO FRANCISCO SILVA</MEMO>
      </STMTTRN>
    </BANKTRANLIST>
  </STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`;

describe("valorOfxParaCentavos", () => {
  it("lê o formato da especificação (ponto decimal)", () => {
    expect(valorOfxParaCentavos("9812.40")).toBe(981240);
    expect(valorOfxParaCentavos("-4230.00")).toBe(-423000);
    expect(valorOfxParaCentavos("0.01")).toBe(1);
  });

  it("tolera emissor que manda vírgula como decimal", () => {
    expect(valorOfxParaCentavos("9812,40")).toBe(981240);
    expect(valorOfxParaCentavos("1.234,56")).toBe(123456);
    expect(valorOfxParaCentavos("-1.234,56")).toBe(-123456);
  });

  it("valor inteiro sem decimais vira centavos corretamente", () => {
    expect(valorOfxParaCentavos("1000")).toBe(100000);
  });

  it("não perde centavo por arredondamento binário", () => {
    expect(valorOfxParaCentavos("19.99")).toBe(1999);
    expect(valorOfxParaCentavos("0.29")).toBe(29);
    expect(valorOfxParaCentavos("8.70")).toBe(870);
  });

  it("recusa valor ilegível", () => {
    expect(() => valorOfxParaCentavos("")).toThrow(ErroDeNegocio);
    expect(() => valorOfxParaCentavos("abc")).toThrow(ErroDeNegocio);
  });
});

describe("dataOfxParaISO", () => {
  it("aceita data curta e data com hora e fuso", () => {
    expect(dataOfxParaISO("20260805")).toBe("2026-08-05");
    expect(dataOfxParaISO("20260805120000[-3:BRT]")).toBe("2026-08-05");
  });

  it("recusa data truncada", () => {
    expect(() => dataOfxParaISO("2026")).toThrow(ErroDeNegocio);
  });
});

describe("lerOfx", () => {
  it("lê um extrato OFX 1.x completo", () => {
    const extrato = lerOfx(OFX_1X);

    expect(extrato.transacoes).toHaveLength(3);
    expect(extrato.periodoInicio).toBe("2026-08-01");
    expect(extrato.periodoFim).toBe("2026-08-31");
    expect(extrato.contaBanco).toBe("001");
    expect(extrato.numeroConta).toBe("12345-6");

    expect(extrato.transacoes[0]).toEqual({
      identificadorBanco: "TX0001",
      data: "2026-08-05",
      valor: 981240,
      descricao: "TED RECEB JOAO FRANCISCO SILVA",
    });
    expect(extrato.transacoes[1].valor).toBe(-423000);
  });

  it("corrige tarifa que veio com sinal positivo", () => {
    // TX0003 é <TRNTYPE>FEE com <TRNAMT>12.90 (sem sinal): é saída.
    const extrato = lerOfx(OFX_1X);
    expect(extrato.transacoes[2].valor).toBe(-1290);
  });

  it("lê OFX 2.x (XML) com o mesmo resultado", () => {
    const extrato = lerOfx(OFX_2X);
    expect(extrato.transacoes).toHaveLength(1);
    expect(extrato.transacoes[0]).toEqual({
      identificadorBanco: "TX0001",
      data: "2026-08-05",
      valor: 981240,
      descricao: "TED RECEB JOAO FRANCISCO SILVA",
    });
    expect(extrato.numeroConta).toBe("99887-7");
  });

  it("cai para NAME quando não há MEMO", () => {
    const semMemo = OFX_2X.replace(
      "<MEMO>TED RECEB JOAO FRANCISCO SILVA</MEMO>",
      "<NAME>PAGADOR SEM MEMO</NAME>",
    );
    expect(lerOfx(semMemo).transacoes[0].descricao).toBe("PAGADOR SEM MEMO");
  });

  it("recusa arquivo que não é OFX", () => {
    expect(() => lerOfx("isto é um csv;1;2;3")).toThrow(ErroDeNegocio);
  });

  it("recusa transação sem FITID — sem ele não há deduplicação (RN-16)", () => {
    const semFitid = OFX_1X.replace("<FITID>TX0001\n", "");
    expect(() => lerOfx(semFitid)).toThrow(ErroDeNegocio);
  });

  it("extrato sem transações não quebra", () => {
    const vazio = `<OFX><BANKTRANLIST><DTSTART>20260801<DTEND>20260831</BANKTRANLIST></OFX>`;
    const extrato = lerOfx(vazio);
    expect(extrato.transacoes).toEqual([]);
    expect(extrato.periodoInicio).toBe("2026-08-01");
  });
});
