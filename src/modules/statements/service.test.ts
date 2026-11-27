import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { NotFound } from "@/shared/errors"
import {
  deleteBankTransaction,
  getImportSummary,
  importStatement,
  listBankTransactions,
  listImports,
} from "./service"

let org: TestOrg
let otherOrg: TestOrg

beforeAll(async () => {
  org = await createTestOrganization("Statements")
  otherOrg = await createTestOrganization("Statements other")
})

afterAll(async () => {
  await removeTestOrganizations([org.id, otherOrg.id])
})

/** A bank account of its own, so a test's history isn't mixed with another test's imports. */
async function freshBankAccount(organizationId = org.id) {
  const account = await prismaAdmin.bankAccount.create({
    data: {
      organizationId,
      name: `History ${Date.now()}-${Math.random()}`,
      bank: "Test Bank",
      branchNumber: "0001",
      accountNumber: "1",
      holderType: "COMPANY",
      controlStartDate: new Date("2026-01-01"),
    },
  })
  return account.id
}

const day = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null

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
    const result = await importStatement(org.id, org.userId, {
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

    const first = await importStatement(org.id, org.userId, {
      bankAccountId: org.bankAccountId,
      fileName: "extrato.ofx",
      content,
    })
    expect(first.importedCount).toBe(1)
    expect(first.duplicateCount).toBe(0)

    const second = await importStatement(org.id, org.userId, {
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
      importStatement(org.id, org.userId, {
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

    await importStatement(org.id, org.userId, { bankAccountId: org.bankAccountId, fileName: "a.ofx", content })
    const [created] = (await listBankTransactions(org.id, org.bankAccountId)).filter(
      (t) => t.bankReference === fitId,
    )

    await deleteBankTransaction(org.id, created.id)

    expect((await listBankTransactions(org.id, org.bankAccountId)).some((t) => t.id === created.id)).toBe(
      false,
    )

    const reimport = await importStatement(org.id, org.userId, {
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

describe("listImports", () => {
  it("records every upload — reimports included — with who sent it and what it found, newest first", async () => {
    const bankAccountId = await freshBankAccount()
    const fitIds = [`hist-a-${Date.now()}`, `hist-b-${Date.now()}`]

    await importStatement(org.id, org.userId, {
      bankAccountId,
      fileName: "agosto.ofx",
      content: ofxWithReferences([fitIds[0]]),
    })
    await importStatement(org.id, org.userId, {
      bankAccountId,
      fileName: "agosto-completo.ofx",
      content: ofxWithReferences(fitIds),
    })

    const imports = await listImports(org.id, bankAccountId)

    expect(imports.map((i) => i.fileName)).toEqual(["agosto-completo.ofx", "agosto.ofx"])
    const [latest, first] = imports
    expect(latest).toMatchObject({
      importedByName: "Test User",
      totalCount: 2,
      importedCount: 1,
      duplicateCount: 1,
      linkedCount: 1,
      reconciledCount: 0,
    })
    expect(day(latest.periodStart)).toBe("2026-08-01")
    expect(day(latest.periodEnd)).toBe("2026-08-31")
    expect(first).toMatchObject({ totalCount: 1, importedCount: 1, duplicateCount: 0 })
  })

  it("keeps a reimport that brought nothing new in the history", async () => {
    const bankAccountId = await freshBankAccount()
    const content = ofxWithReferences([`hist-repeat-${Date.now()}`])

    await importStatement(org.id, org.userId, { bankAccountId, fileName: "a.ofx", content })
    await importStatement(org.id, org.userId, { bankAccountId, fileName: "a.ofx", content })

    const [reimport] = await listImports(org.id, bankAccountId)
    expect(reimport).toMatchObject({ totalCount: 1, importedCount: 0, duplicateCount: 1, linkedCount: 0 })
  })

  it("falls back to the linked transactions on imports from before counts were recorded", async () => {
    const bankAccountId = await freshBankAccount()
    const legacy = await prismaAdmin.import.create({
      data: { organizationId: org.id, bankAccountId, fileName: "antigo.ofx" },
    })
    await prismaAdmin.bankTransaction.createMany({
      data: [
        { date: new Date("2026-07-03"), status: "RECONCILED" as const },
        { date: new Date("2026-07-10"), status: "PENDING" as const },
        { date: new Date("2026-07-20"), status: "RECONCILED" as const },
      ].map((transaction, index) => ({
        organizationId: org.id,
        bankAccountId,
        importId: legacy.id,
        bankReference: `legacy-${legacy.id}-${index}`,
        amount: 1000,
        description: "Antiga",
        ...transaction,
      })),
    })

    const [statementImport] = await listImports(org.id, bankAccountId)

    expect(statementImport).toMatchObject({
      importedByName: null,
      totalCount: null,
      duplicateCount: null,
      importedCount: 3,
      linkedCount: 3,
      reconciledCount: 2,
    })
    expect(day(statementImport.periodStart)).toBe("2026-07-03")
    expect(day(statementImport.periodEnd)).toBe("2026-07-20")
  })

  it("is empty for an account that never got a statement", async () => {
    expect(await listImports(org.id, await freshBankAccount())).toEqual([])
  })

  it("doesn't reach another organization's account (RLS)", async () => {
    const foreignAccountId = await freshBankAccount(otherOrg.id)
    await expect(listImports(org.id, foreignAccountId)).rejects.toThrow(NotFound)
  })
})

describe("getImportSummary", () => {
  it("is empty before any import", async () => {
    expect(await getImportSummary(org.id, await freshBankAccount())).toEqual({
      lastImportedAt: null,
      coveredUntil: null,
    })
  })

  it("gives the latest upload, and covers up to the later of DTEND and the last transaction", async () => {
    const bankAccountId = await freshBankAccount()
    await importStatement(org.id, org.userId, {
      bankAccountId,
      fileName: "agosto.ofx",
      content: ofxWithReferences([`summary-${Date.now()}`]),
    })
    // A file without DTEND whose transactions go past August's.
    const lastImport = await prismaAdmin.import.create({
      data: { organizationId: org.id, bankAccountId, fileName: "setembro.ofx" },
    })
    await prismaAdmin.bankTransaction.create({
      data: {
        organizationId: org.id,
        bankAccountId,
        importId: lastImport.id,
        bankReference: `summary-sep-${lastImport.id}`,
        date: new Date("2026-09-05"),
        amount: 1000,
        description: "Setembro",
      },
    })

    const summary = await getImportSummary(org.id, bankAccountId)

    expect(summary.lastImportedAt?.getTime()).toBe(lastImport.createdAt.getTime())
    expect(day(summary.coveredUntil)).toBe("2026-09-05")
  })

})
