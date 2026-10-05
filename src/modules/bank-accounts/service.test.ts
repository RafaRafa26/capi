import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { createSettlement } from "@/modules/settlements/service"
import { bankAccountInputSchema } from "./schema"
import { createBankAccount, getBankAccount, getBankAccountStatement, getBankAccountsOverview, updateBankAccount } from "./service"

const INITIAL_BALANCE = 100_000

let org: TestOrg
let otherOrg: TestOrg
let accountId: string

beforeAll(async () => {
  org = await createTestOrganization("BankAccounts")
  otherOrg = await createTestOrganization("BankAccounts other")
  const suffix = Date.now()

  const account = await prismaAdmin.bankAccount.create({
    data: {
      organizationId: org.id,
      name: "Conta do extrato",
      bank: "Banco de teste",
      branchNumber: "0001",
      accountNumber: `acc-extrato-${suffix}`,
      holderType: "COMPANY",
      controlStartDate: new Date(2026, 7, 1),
      initialBalance: INITIAL_BALANCE,
    },
  })
  accountId = account.id
})

afterAll(async () => {
  await removeTestOrganizations([org.id, otherOrg.id])
})

async function createTransaction(amount: number, date: Date) {
  const bankImport = await prismaAdmin.import.create({
    data: { organizationId: org.id, bankAccountId: accountId, fileName: "test.ofx" },
  })
  return prismaAdmin.bankTransaction.create({
    data: {
      organizationId: org.id,
      bankAccountId: accountId,
      importId: bankImport.id,
      bankReference: `ref-${Date.now()}-${Math.random()}`,
      date,
      amount,
      description: amount >= 0 ? "Recebimento de teste" : "Pagamento de teste",
    },
  })
}

async function createEntry(type: "RECEIVABLE" | "PAYABLE", amount: number) {
  return prismaAdmin.entry.create({
    data: {
      organizationId: org.id,
      contactId: org.contactId,
      categoryId: org.categoryId,
      bankAccountId: accountId,
      type,
      description: `Lançamento ${type}`,
      dueDate: new Date(2026, 7, 10),
      amount,
      paymentMethod: "PIX",
    },
  })
}

/** Conciliar é o que faz a transação entrar no saldo — importar, sozinho, não. */
async function reconcile(amount: number, date: Date, type: "RECEIVABLE" | "PAYABLE" = "RECEIVABLE") {
  const [transaction, entry] = await Promise.all([createTransaction(amount, date), createEntry(type, Math.abs(amount))])
  await createSettlement(org.id, {
    entryId: entry.id,
    bankTransactionId: transaction.id,
    settledAmount: Math.abs(amount),
    settledAt: date,
  })
  return transaction
}

async function overviewFor(id: string) {
  const accounts = await getBankAccountsOverview(org.id)
  return accounts.find((account) => account.id === id)
}

describe("getBankAccountsOverview", () => {
  it("starts at the account's initial balance, with nothing reconciled yet", async () => {
    const account = await overviewFor(accountId)
    expect(account?.currentBalance).toBe(INITIAL_BALANCE)
    expect(account?.pendingCount).toBe(0)
  })

  it("counts an imported transaction as pending, without moving the balance", async () => {
    await createTransaction(50_000, new Date(2026, 7, 5))

    const account = await overviewFor(accountId)
    expect(account?.pendingCount).toBe(1)
    expect(account?.currentBalance).toBe(INITIAL_BALANCE)
  })

  it("adds a credit and subtracts a debit once they're reconciled", async () => {
    await reconcile(30_000, new Date(2026, 7, 6))
    await reconcile(-10_000, new Date(2026, 7, 7), "PAYABLE")

    const account = await overviewFor(accountId)
    expect(account?.currentBalance).toBe(INITIAL_BALANCE + 30_000 - 10_000)
    // A transação importada e não conciliada continua fora do saldo.
    expect(account?.pendingCount).toBe(1)
  })
})

describe("getBankAccountStatement", () => {
  it("lists only reconciled transactions, in chronological order, with a running balance", async () => {
    const statement = await getBankAccountStatement(org.id, accountId)

    expect(statement.lines).toHaveLength(2)
    expect(statement.lines.map((line) => line.amount)).toEqual([30_000, -10_000])

    const dates = statement.lines.map((line) => line.date.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => a - b))

    expect(statement.lines[0].runningBalance).toBe(INITIAL_BALANCE + 30_000)
    expect(statement.lines[1].runningBalance).toBe(INITIAL_BALANCE + 30_000 - 10_000)
    expect(statement.currentBalance).toBe(statement.lines[1].runningBalance)
  })

  it("says which lançamento each transaction settled", async () => {
    const statement = await getBankAccountStatement(org.id, accountId)

    expect(statement.lines[0].settledEntries).toHaveLength(1)
    expect(statement.lines[0].settledEntries[0].contactName).toBe("Test Contact")
    expect(statement.lines[0].settledEntries[0].description).toBe("Lançamento RECEIVABLE")
  })
})

describe("updateBankAccount", () => {
  const input = {
    name: "Conta renomeada",
    bank: "Banco novo",
    branchNumber: "0002",
    accountNumber: "12345-6",
    kind: "SAVINGS_POCKET" as const,
    holderType: "INDIVIDUAL" as const,
    // Como o formulário manda: "2026-07-15", que o zod lê como meia-noite UTC.
    controlStartDate: new Date("2026-07-15"),
    initialBalance: 250_000,
  }

  it("saves every field and reads the control start date back on the same day", async () => {
    await updateBankAccount(org.id, org.bankAccountId, input)

    const account = await getBankAccount(org.id, org.bankAccountId)
    expect(account).toMatchObject({ ...input, controlStartDate: expect.any(Date) })
    const date = account.controlStartDate
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 6, 15])
  })

  it("can't touch another organization's account", async () => {
    await expect(updateBankAccount(otherOrg.id, org.bankAccountId, input)).rejects.toThrow("not found")
  })
})

describe("createBankAccount", () => {
  it("doesn't require agência nor número da conta", async () => {
    const input = bankAccountInputSchema.parse({
      name: "Caixa físico",
      bank: "Nenhum",
      branchNumber: "  ",
      accountNumber: "",
      kind: "CHECKING",
      holderType: "COMPANY",
      controlStartDate: "2026-10-01",
      initialBalance: 0,
    })

    const account = await createBankAccount(org.id, input)
    expect(account).toMatchObject({ branchNumber: "", accountNumber: "" })
  })
})
