import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { BusinessError, NotFound } from "@/shared/errors"
import {
  createAndSettlePayable,
  createSettlement,
  createSettlementBatch,
  getBeneficiaryAvailableBalance,
  manualSettleEntry,
  suggestMatchesForTransaction,
  undoSettlement,
} from "./service"

let org: TestOrg
let expenseCategoryId: string
let supplierId: string
let beneficiaryId: string

beforeAll(async () => {
  org = await createTestOrganization("Settlements")
  const suffix = Date.now()

  const [expenseCategory, supplier, beneficiary] = await Promise.all([
    prismaAdmin.category.create({ data: { organizationId: org.id, name: `Despesa ${suffix}`, type: "EXPENSE" } }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Fornecedor de teste",
        document: `supplier-${suffix}`,
        personType: "COMPANY",
        contactType: "SUPPLIER",
      },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Favorecido de teste",
        document: `beneficiary-${suffix}`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    }),
  ])
  expenseCategoryId = expenseCategory.id
  supplierId = supplier.id
  beneficiaryId = beneficiary.id
})

afterAll(async () => {
  await removeTestOrganizations([org.id])
})

async function createReceivableEntry(amount: number, opts?: { allocationAmount?: number }) {
  const sale = await prismaAdmin.sale.create({
    data: {
      organizationId: org.id,
      contactId: org.contactId,
      categoryId: org.categoryId,
      bankAccountId: org.bankAccountId,
      description: "Venda de teste",
      totalAmount: amount,
      paymentMethod: "PIX",
      billingType: "INSTALLMENTS",
      installmentsCount: 1,
      billingFrequency: "MONTHLY",
      firstDueDate: new Date(2026, 7, 10),
      entries: {
        create: [
          {
            organizationId: org.id,
            contactId: org.contactId,
            categoryId: org.categoryId,
            bankAccountId: org.bankAccountId,
            installmentNumber: 1,
            type: "RECEIVABLE",
            description: "Parcela de teste",
            dueDate: new Date(2026, 7, 10),
            amount,
            paymentMethod: "PIX",
          },
        ],
      },
      ...(opts?.allocationAmount
        ? {
            allocations: {
              create: [
                {
                  organizationId: org.id,
                  beneficiaryId,
                  mode: "FIXED_AMOUNT" as const,
                  amount: opts.allocationAmount,
                  order: 0,
                },
              ],
            },
          }
        : {}),
    },
    include: { entries: true },
  })
  return { sale, entry: sale.entries[0] }
}

async function createBankTransaction(amount: number, date = new Date(2026, 7, 10)) {
  const bankImport = await prismaAdmin.import.create({
    data: { organizationId: org.id, bankAccountId: org.bankAccountId, fileName: "test.ofx" },
  })
  return prismaAdmin.bankTransaction.create({
    data: {
      organizationId: org.id,
      bankAccountId: org.bankAccountId,
      importId: bankImport.id,
      bankReference: `ref-${Date.now()}-${Math.random()}`,
      date,
      amount,
      description: "Transação de teste",
    },
  })
}

describe("createSettlement", () => {
  it("settles an entry in full and marks the bank transaction RECONCILED", async () => {
    const { entry } = await createReceivableEntry(10_000)
    const transaction = await createBankTransaction(10_000)

    await createSettlement(org.id, {
      entryId: entry.id,
      bankTransactionId: transaction.id,
      settledAmount: 10_000,
      settledAt: new Date(2026, 7, 10),
    })

    const updatedEntry = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updatedEntry.status).toBe("SETTLED")
    expect(updatedEntry.settledAmount).toBe(10_000)

    const updatedTransaction = await prismaAdmin.bankTransaction.findUniqueOrThrow({ where: { id: transaction.id } })
    expect(updatedTransaction.status).toBe("RECONCILED")
  })

  it("leaves the entry PARTIAL when the settled amount is less than the total", async () => {
    const { entry } = await createReceivableEntry(10_000)
    const transaction = await createBankTransaction(4_000)

    await createSettlement(org.id, {
      entryId: entry.id,
      bankTransactionId: transaction.id,
      settledAmount: 4_000,
      settledAt: new Date(2026, 7, 10),
    })

    const updatedEntry = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updatedEntry.status).toBe("PARTIAL")
    expect(updatedEntry.settledAmount).toBe(4_000)
  })

  it("rejects an unknown entry", async () => {
    const transaction = await createBankTransaction(1_000)
    await expect(
      createSettlement(org.id, {
        entryId: "00000000-0000-0000-0000-000000000000",
        bankTransactionId: transaction.id,
        settledAmount: 1_000,
        settledAt: new Date(),
      }),
    ).rejects.toThrow(NotFound)
  })
})

describe("createSettlementBatch", () => {
  it("settles multiple entries from a single bank transaction (RN-07)", async () => {
    const { entry: entryA } = await createReceivableEntry(6_000)
    const { entry: entryB } = await createReceivableEntry(4_000)
    const transaction = await createBankTransaction(10_000)

    await createSettlementBatch(org.id, {
      bankTransactionId: transaction.id,
      items: [
        { entryId: entryA.id, settledAmount: 6_000, settledAt: new Date(2026, 7, 10) },
        { entryId: entryB.id, settledAmount: 4_000, settledAt: new Date(2026, 7, 10) },
      ],
    })

    const [updatedA, updatedB] = await Promise.all([
      prismaAdmin.entry.findUniqueOrThrow({ where: { id: entryA.id } }),
      prismaAdmin.entry.findUniqueOrThrow({ where: { id: entryB.id } }),
    ])
    expect(updatedA.status).toBe("SETTLED")
    expect(updatedB.status).toBe("SETTLED")
  })
})

describe("undoSettlement", () => {
  it("reverts the entry and bank transaction to their pre-settlement state", async () => {
    const { entry } = await createReceivableEntry(10_000)
    const transaction = await createBankTransaction(10_000)

    await createSettlement(org.id, {
      entryId: entry.id,
      bankTransactionId: transaction.id,
      settledAmount: 10_000,
      settledAt: new Date(2026, 7, 10),
    })

    const settlement = await prismaAdmin.settlement.findFirstOrThrow({ where: { entryId: entry.id } })
    await undoSettlement(org.id, settlement.id)

    const updatedEntry = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updatedEntry.status).toBe("FORECAST")
    expect(updatedEntry.settledAmount).toBeNull()

    const updatedTransaction = await prismaAdmin.bankTransaction.findUniqueOrThrow({ where: { id: transaction.id } })
    expect(updatedTransaction.status).toBe("PENDING")
  })
})

describe("manualSettleEntry", () => {
  it("settles the remaining amount without touching a bank transaction or crediting a favorecido", async () => {
    const { entry } = await createReceivableEntry(10_000, { allocationAmount: 5_000 })

    await manualSettleEntry(org.id, {
      entryId: entry.id,
      settledAt: new Date(2026, 7, 12),
      note: "Pago em espécie",
    })

    const updatedEntry = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updatedEntry.status).toBe("SETTLED")

    const balance = await getBeneficiaryAvailableBalance(org.id, beneficiaryId)
    expect(balance).toBe(0)
  })

  it("rejects an entry that's already fully settled", async () => {
    const { entry } = await createReceivableEntry(5_000)
    await manualSettleEntry(org.id, { entryId: entry.id, settledAt: new Date(2026, 7, 12) })

    await expect(manualSettleEntry(org.id, { entryId: entry.id, settledAt: new Date(2026, 7, 13) })).rejects.toThrow(
      BusinessError,
    )
  })
})

describe("createAndSettlePayable", () => {
  it("creates a standalone PAYABLE entry already settled by the transaction", async () => {
    const transaction = await createBankTransaction(-3_000)

    await createAndSettlePayable(org.id, {
      contactId: supplierId,
      categoryId: expenseCategoryId,
      bankAccountId: org.bankAccountId,
      description: "Taxa bancária de teste",
      bankTransactionId: transaction.id,
      settledAmount: 3_000,
      settledAt: new Date(2026, 7, 10),
    })

    const entry = await prismaAdmin.entry.findFirstOrThrow({
      where: { organizationId: org.id, contactId: supplierId, description: "Taxa bancária de teste" },
    })
    expect(entry.type).toBe("PAYABLE")
    expect(entry.status).toBe("SETTLED")
    expect(entry.saleId).toBeNull()

    const updatedTransaction = await prismaAdmin.bankTransaction.findUniqueOrThrow({ where: { id: transaction.id } })
    expect(updatedTransaction.status).toBe("RECONCILED")
  })
})

describe("suggestMatchesForTransaction", () => {
  it("suggests an open receivable whose remaining amount matches an incoming transaction", async () => {
    const { entry } = await createReceivableEntry(7_500)
    const transaction = await createBankTransaction(7_500)

    const suggestions = await suggestMatchesForTransaction(org.id, transaction.id)
    expect(suggestions.map((s) => s.id)).toContain(entry.id)
  })
})

describe("getBeneficiaryAvailableBalance", () => {
  it("credits the favorecido proportionally to what was actually settled", async () => {
    const { entry } = await createReceivableEntry(10_000, { allocationAmount: 3_000 })
    const transaction = await createBankTransaction(5_000)

    // Partial settlement: 50% of the sale settled → 50% of the allocation credited.
    await createSettlement(org.id, {
      entryId: entry.id,
      bankTransactionId: transaction.id,
      settledAmount: 5_000,
      settledAt: new Date(2026, 7, 10),
    })

    const balance = await getBeneficiaryAvailableBalance(org.id, beneficiaryId)
    expect(balance).toBe(1_500)
  })
})
