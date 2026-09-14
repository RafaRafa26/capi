import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { NotFound } from "@/shared/errors"
import { deleteBankTransaction, importStatement, listBankTransactions } from "./service"

let org: TestOrg

beforeAll(async () => {
  org = await createTestOrganization("Statements")
})

afterAll(async () => {
  await removeTestOrganizations([org.id])
})

function ofxWithReferences(fitIds: string[]) {
  const transactions = fitIds
    .map(
      (fitId, index) => `<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>2026080${index + 1}120000
<TRNAMT>100.00
<FITID>${fitId}
<MEMO>Transacao ${fitId}
</STMTTRN>`,
    )
    .join("\n")

  return `<OFX>
<BANKTRANLIST>
<DTSTART>20260801000000
<DTEND>20260831235959
${transactions}
</BANKTRANLIST>
</OFX>`
}

describe("importStatement", () => {
  it("creates one bank transaction per FITID", async () => {
    const result = await importStatement(org.id, {
      bankAccountId: org.bankAccountId,
      fileName: "extrato-agosto.ofx",
      content: ofxWithReferences([`unique-a-${Date.now()}`, `unique-b-${Date.now()}`]),
    })

    expect(result.importedCount).toBe(2)
    expect(result.duplicateCount).toBe(0)
    expect(result.totalCount).toBe(2)
  })

  it("RN-16: reimporting the same file produces no duplicates", async () => {
    const fitId = `repeat-${Date.now()}`
    const content = ofxWithReferences([fitId])

    const first = await importStatement(org.id, {
      bankAccountId: org.bankAccountId,
      fileName: "extrato.ofx",
      content,
    })
    expect(first.importedCount).toBe(1)
    expect(first.duplicateCount).toBe(0)

    const second = await importStatement(org.id, {
      bankAccountId: org.bankAccountId,
      fileName: "extrato.ofx",
      content,
    })
    expect(second.importedCount).toBe(0)
    expect(second.duplicateCount).toBe(1)

    const transactions = await listBankTransactions(org.id, org.bankAccountId)
    expect(transactions.filter((t) => t.bankReference === fitId)).toHaveLength(1)
  })

  it("rejects an unknown bank account", async () => {
    await expect(
      importStatement(org.id, {
        bankAccountId: "00000000-0000-0000-0000-000000000000",
        fileName: "extrato.ofx",
        content: ofxWithReferences([`orphan-${Date.now()}`]),
      }),
    ).rejects.toThrow(NotFound)
  })
})

describe("deleteBankTransaction", () => {
  it("removes the transaction, and reimporting the same file recreates it", async () => {
    const fitId = `deletable-${Date.now()}`
    const content = ofxWithReferences([fitId])

    await importStatement(org.id, { bankAccountId: org.bankAccountId, fileName: "a.ofx", content })
    const [created] = (await listBankTransactions(org.id, org.bankAccountId)).filter(
      (t) => t.bankReference === fitId,
    )

    await deleteBankTransaction(org.id, created.id)

    expect((await listBankTransactions(org.id, org.bankAccountId)).some((t) => t.id === created.id)).toBe(
      false,
    )

    const reimport = await importStatement(org.id, {
      bankAccountId: org.bankAccountId,
      fileName: "a.ofx",
      content,
    })
    expect(reimport.importedCount).toBe(1)
  })

  it("rejects an unknown transaction", async () => {
    await expect(
      deleteBankTransaction(org.id, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(NotFound)
  })
})
