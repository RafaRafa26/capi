import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { createSettlement } from "@/modules/settlements/service"
import { BusinessError } from "@/shared/errors"
import { generatePayout, getBeneficiaryStatement, getPayoutSummary, listAvailableCredits } from "./service"

let org: TestOrg
let beneficiaryId: string

beforeAll(async () => {
  org = await createTestOrganization("Payouts")
  const suffix = Date.now()

  // A categoria de despesa do repasse é criada pelo próprio serviço.
  const beneficiary = await prismaAdmin.contact.create({
    data: {
      organizationId: org.id,
      name: "Fazenda Santa Luzia",
      document: `beneficiary-${suffix}`,
      personType: "COMPANY",
      contactType: "BENEFICIARY",
      bankDetails: { pixKey: `pix-${suffix}` },
    },
  })
  beneficiaryId = beneficiary.id
})

afterAll(async () => {
  await removeTestOrganizations([org.id])
})

/** Uma venda de uma parcela com repasse por valor fixo para o favorecido do teste. */
async function createSaleWithAllocation(totalAmount: number, allocationAmount: number, favorecidoId = beneficiaryId) {
  const sale = await prismaAdmin.sale.create({
    data: {
      organizationId: org.id,
      contactId: org.contactId,
      categoryId: org.categoryId,
      bankAccountId: org.bankAccountId,
      description: "Venda de teste",
      totalAmount,
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
            amount: totalAmount,
            paymentMethod: "PIX",
          },
        ],
      },
      allocations: {
        create: [
          { organizationId: org.id, beneficiaryId: favorecidoId, mode: "FIXED_AMOUNT", amount: allocationAmount, order: 0 },
        ],
      },
    },
    include: { entries: true },
  })
  return { sale, entry: sale.entries[0] }
}

async function createBankTransaction(amount: number) {
  const bankImport = await prismaAdmin.import.create({
    data: { organizationId: org.id, bankAccountId: org.bankAccountId, fileName: "test.ofx" },
  })
  return prismaAdmin.bankTransaction.create({
    data: {
      organizationId: org.id,
      bankAccountId: org.bankAccountId,
      importId: bankImport.id,
      bankReference: `ref-${Date.now()}-${Math.random()}`,
      date: new Date(2026, 7, 10),
      amount,
      description: "Transação de teste",
    },
  })
}

/** Concilia a parcela inteira, que é o que credita o favorecido (RN-01). */
async function settleReceivable(entryId: string, amount: number) {
  const transaction = await createBankTransaction(amount)
  await createSettlement(org.id, {
    entryId,
    bankTransactionId: transaction.id,
    settledAmount: amount,
    settledAt: new Date(2026, 7, 10),
  })
}

async function availableFor(beneficiary: string) {
  const { beneficiaries } = await getPayoutSummary(org.id)
  return beneficiaries.find((row) => row.beneficiaryId === beneficiary)
}

describe("getPayoutSummary", () => {
  it("credits the favorecido proportionally to what was actually settled", async () => {
    const { entry } = await createSaleWithAllocation(10_000, 3_000)
    // Metade da venda liquidada → metade do repasse creditado.
    await settleReceivable(entry.id, 5_000)

    const position = await availableFor(beneficiaryId)
    expect(position?.available).toBe(1_500)
    expect(position?.pending).toBe(0)
    expect(position?.realized).toBe(0)
  })

  it("lists a favorecido with no credits at all, zeroed", async () => {
    const other = await prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Favorecido sem saldo",
        document: `beneficiary-empty-${Date.now()}`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    })

    const position = await availableFor(other.id)
    expect(position).toMatchObject({ available: 0, pending: 0, realized: 0 })
  })
})

describe("generatePayout", () => {
  it("creates a PAYABLE entry for the whole available balance, with no bank account yet", async () => {
    const { entry } = await createSaleWithAllocation(20_000, 20_000)
    await settleReceivable(entry.id, 20_000)

    const before = await availableFor(beneficiaryId)
    await generatePayout(org.id, { beneficiaryId, dueDate: new Date(2026, 7, 15) })

    const payable = await prismaAdmin.entry.findFirstOrThrow({
      where: { organizationId: org.id, contactId: beneficiaryId, type: "PAYABLE" },
      orderBy: { createdAt: "desc" },
    })
    expect(payable.status).toBe("FORECAST")
    expect(payable.amount).toBe(before?.available)
    // A conta de onde sai o dinheiro só é decidida na conciliação.
    expect(payable.bankAccountId).toBeNull()

    const after = await availableFor(beneficiaryId)
    expect(after?.available).toBe(0)
    expect(after?.pending).toBe((before?.pending ?? 0) + (before?.available ?? 0))
  })

  it("rejects a favorecido with no available balance (RN-10)", async () => {
    const empty = await prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Favorecido sem repasse",
        document: `beneficiary-no-balance-${Date.now()}`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    })

    await expect(
      generatePayout(org.id, { beneficiaryId: empty.id, dueDate: new Date(2026, 7, 15) }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it("moves pending to realized once the repasse entry is reconciled", async () => {
    const { entry } = await createSaleWithAllocation(8_000, 8_000)
    await settleReceivable(entry.id, 8_000)

    const disponivel = (await availableFor(beneficiaryId))?.available ?? 0
    await generatePayout(org.id, { beneficiaryId, dueDate: new Date(2026, 7, 20) })
    const payable = await prismaAdmin.entry.findFirstOrThrow({
      where: { organizationId: org.id, contactId: beneficiaryId, type: "PAYABLE" },
      orderBy: { createdAt: "desc" },
    })

    const before = await availableFor(beneficiaryId)

    // Conciliação comum de conta a pagar — nada específico de repasse.
    const transaction = await createBankTransaction(-disponivel)
    await createSettlement(org.id, {
      entryId: payable.id,
      bankTransactionId: transaction.id,
      settledAmount: disponivel,
      settledAt: new Date(2026, 7, 20),
    })

    const after = await availableFor(beneficiaryId)
    expect(after?.pending).toBe((before?.pending ?? 0) - disponivel)
    expect(after?.realized).toBe((before?.realized ?? 0) + disponivel)
    // Repasse pago não devolve saldo: já tinha saído do disponível ao ser gerado.
    expect(after?.available).toBe(before?.available)
  })
})

describe("getBeneficiaryStatement", () => {
  it("lists the receipt that credited the favorecido and the repasse that debited him", async () => {
    const statement = await getBeneficiaryStatement(org.id, beneficiaryId)

    const credit = statement.lines.find((line) => line.kind === "CREDIT")
    expect(credit?.amount).toBeGreaterThan(0)
    expect(credit?.title).toBe("Test Contact")
    expect(credit?.entryId).toBeTruthy()

    const debit = statement.lines.find((line) => line.kind === "DEBIT")
    expect(debit?.amount).toBeLessThan(0)
    expect(debit?.status).not.toBeNull()

    // Mais recente primeiro.
    const dates = statement.lines.map((line) => line.date.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => b - a))
  })
})

describe("listAvailableCredits", () => {
  it("shows which receipts make up the balance, with who paid", async () => {
    const { entry } = await createSaleWithAllocation(4_000, 4_000)
    await settleReceivable(entry.id, 4_000)

    const credits = await listAvailableCredits(org.id, beneficiaryId)

    expect(credits.length).toBeGreaterThan(0)
    expect(credits.every((credit) => credit.payerName === "Test Contact")).toBe(true)
    expect(credits.every((credit) => credit.amount > 0)).toBe(true)
  })

  it("drops receipts already consumed by a previous repasse, summing exactly the available balance", async () => {
    const fresh = await prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Favorecido FIFO",
        document: `beneficiary-fifo-${Date.now()}`,
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
      },
    })

    // Dois recebimentos conciliados em datas diferentes: 5.000 e depois 3.000.
    const primeiro = await createSaleWithAllocation(5_000, 5_000, fresh.id)
    await settleReceivable(primeiro.entry.id, 5_000)
    await generatePayout(org.id, { beneficiaryId: fresh.id, dueDate: new Date(2026, 7, 15) })

    const segundo = await createSaleWithAllocation(3_000, 3_000, fresh.id)
    await settleReceivable(segundo.entry.id, 3_000)

    const credits = await listAvailableCredits(org.id, fresh.id)
    const disponivel = (await availableFor(fresh.id))?.available ?? 0

    // O recebimento de 5.000 já saiu no repasse anterior e não pode reaparecer.
    expect(disponivel).toBe(3_000)
    expect(credits).toHaveLength(1)
    expect(credits[0].amount).toBe(3_000)
    expect(credits.reduce((sum, credit) => sum + credit.amount, 0)).toBe(disponivel)
  })
})
