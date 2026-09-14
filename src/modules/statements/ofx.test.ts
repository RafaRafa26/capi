import { describe, expect, it } from "vitest"

import { BusinessError } from "@/shared/errors"
import { parseOfx } from "./ofx"

const SGML_SAMPLE = `OFXHEADER:100
DATA:OFXSGML
VERSION:102

<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKTRANLIST>
<DTSTART>20260801000000
<DTEND>20260831235959
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260805120000[-3:BRT]
<TRNAMT>1245.00
<FITID>202608050001
<MEMO>Cobranca recebida - Joao Francisco
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260807083000
<TRNAMT>-199.00
<FITID>202608070002
<MEMO>Taxa de boleto
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<OFX>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <STMTRS>
        <BANKTRANLIST>
          <DTSTART>20260801000000</DTSTART>
          <DTEND>20260831235959</DTEND>
          <STMTTRN>
            <TRNTYPE>CREDIT</TRNTYPE>
            <DTPOSTED>20260805120000</DTPOSTED>
            <TRNAMT>1245.00</TRNAMT>
            <FITID>202608050001</FITID>
            <NAME>Joao Francisco</NAME>
          </STMTTRN>
        </BANKTRANLIST>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>
`

describe("parseOfx", () => {
  it("reads every transaction from an SGML (OFX 1.x) statement", () => {
    const statement = parseOfx(SGML_SAMPLE)

    expect(statement.transactions).toHaveLength(2)
    expect(statement.transactions[0]).toEqual({
      fitId: "202608050001",
      postedAt: new Date(2026, 7, 5, 12, 0, 0),
      amount: 124_500,
      description: "Cobranca recebida - Joao Francisco",
    })
    expect(statement.transactions[1].amount).toBe(-19_900)
  })

  it("strips the timezone suffix from DTPOSTED before parsing the date", () => {
    const statement = parseOfx(SGML_SAMPLE)
    expect(statement.transactions[0].postedAt).toEqual(new Date(2026, 7, 5, 12, 0, 0))
  })

  it("reads the statement period from DTSTART/DTEND", () => {
    const statement = parseOfx(SGML_SAMPLE)
    expect(statement.periodStart).toEqual(new Date(2026, 7, 1, 0, 0, 0))
    expect(statement.periodEnd).toEqual(new Date(2026, 7, 31, 23, 59, 59))
  })

  it("also reads a closed-tag (OFX 2.x / XML) statement", () => {
    const statement = parseOfx(XML_SAMPLE)
    expect(statement.transactions).toEqual([
      {
        fitId: "202608050001",
        postedAt: new Date(2026, 7, 5, 12, 0, 0),
        amount: 124_500,
        description: "Joao Francisco",
      },
    ])
  })

  it("rejects a file with no transactions", () => {
    expect(() => parseOfx("<OFX></OFX>")).toThrow(BusinessError)
  })

  it("rejects a transaction missing FITID", () => {
    const broken = `<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260805120000<TRNAMT>10.00</STMTTRN>`
    expect(() => parseOfx(broken)).toThrow(BusinessError)
  })
})
