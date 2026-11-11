import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { deleteAccountEntry } from "@/modules/accounts/service"
import { createSettlement } from "@/modules/settlements/service"
import { BusinessError } from "@/shared/errors"
import {
  generatePayout,
  getBeneficiaryStatement,
  getPayoutSummary,
  listAvailableCredits,
  listPayoutCredits,
} from "./service"

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
async function settleReceivable(entryId: string, amount: number, settledAt = new Date(2026, 7, 10)) {
  const transaction = await createBankTransaction(amount)
  await createSettlement(org.id, {
    entryId,
    bankTransactionId: transaction.id,
    settledAmount: amount,
    settledAt,
  })
}

/** Repassa todos os recebimentos disponíveis — o que o diálogo faz quando ninguém desmarca nada. */
async function payoutAll(beneficiary: string, dueDate: Date) {
  const credits = await listAvailableCredits(org.id, beneficiary)
  await generatePayout(org.id, {
    beneficiaryId: beneficiary,
    dueDate,
    credits: credits.map(({ settlementId, allocationId }) => ({ settlementId, allocationId })),
  })
}

async function newBeneficiary(name: string) {
  return prismaAdmin.contact.create({
    data: {
      organizationId: org.id,
      name,
      document: `beneficiary-${name}-${Date.now()}-${Math.random()}`,
      personType: "INDIVIDUAL",
      contactType: "BENEFICIARY",
    },
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
    await payoutAll(beneficiaryId, new Date(2026, 7, 15))

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
      generatePayout(org.id, {
        beneficiaryId: empty.id,
        dueDate: new Date(2026, 7, 15),
        credits: [{ settlementId: crypto.randomUUID(), allocationId: crypto.randomUUID() }],
      }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it("moves pending to realized once the repasse entry is reconciled", async () => {
    const { entry } = await createSaleWithAllocation(8_000, 8_000)
    await settleReceivable(entry.id, 8_000)

    const disponivel = (await availableFor(beneficiaryId))?.available ?? 0
    await payoutAll(beneficiaryId, new Date(2026, 7, 20))
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

    // Mais antiga primeiro, como num extrato bancário.
    const dates = statement.lines.map((line) => line.date.getTime())
    expect(dates).toEqual([...dates].sort((a, b) => a - b))
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
    await payoutAll(fresh.id, new Date(2026, 7, 15))

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

describe("generatePayout with chosen receipts", () => {
  it("pays only the selected receipts and keeps the others available", async () => {
    const fresh = await newBeneficiary("Escolha")

    // Três recebimentos: o do meio fica de fora do repasse.
    const a = await createSaleWithAllocation(1_000, 1_000, fresh.id)
    await settleReceivable(a.entry.id, 1_000)
    const b = await createSaleWithAllocation(2_000, 2_000, fresh.id)
    await settleReceivable(b.entry.id, 2_000)
    const c = await createSaleWithAllocation(4_000, 4_000, fresh.id)
    await settleReceivable(c.entry.id, 4_000)

    const before = await listAvailableCredits(org.id, fresh.id)
    const chosen = before.filter((credit) => credit.amount !== 2_000)
    await generatePayout(org.id, {
      beneficiaryId: fresh.id,
      dueDate: new Date(2026, 7, 15),
      credits: chosen.map(({ settlementId, allocationId }) => ({ settlementId, allocationId })),
    })

    const payable = await prismaAdmin.entry.findFirstOrThrow({
      where: { organizationId: org.id, contactId: fresh.id, type: "PAYABLE" },
    })
    expect(payable.amount).toBe(5_000)

    // O recebimento de 2.000 continua lá — mesmo sendo mais antigo que o de 4.000.
    const after = await listAvailableCredits(org.id, fresh.id)
    expect(after).toHaveLength(1)
    expect(after[0].amount).toBe(2_000)
    expect(after[0].entryId).toBe(b.entry.id)
    expect((await availableFor(fresh.id))?.available).toBe(2_000)
  })

  it("rejects a receipt that was already paid out", async () => {
    const fresh = await newBeneficiary("Duplicado")
    const sale = await createSaleWithAllocation(1_500, 1_500, fresh.id)
    await settleReceivable(sale.entry.id, 1_500)

    const [credit] = await listAvailableCredits(org.id, fresh.id)
    const input = {
      beneficiaryId: fresh.id,
      dueDate: new Date(2026, 7, 15),
      credits: [{ settlementId: credit.settlementId, allocationId: credit.allocationId }],
    }
    await generatePayout(org.id, input)

    await expect(generatePayout(org.id, input)).rejects.toBeInstanceOf(BusinessError)
  })

  it("still consumes oldest-first what a payout without chosen receipts covered", async () => {
    const fresh = await newBeneficiary("Legado")
    const older = await createSaleWithAllocation(1_000, 1_000, fresh.id)
    await settleReceivable(older.entry.id, 1_000, new Date(2026, 7, 5))
    const newer = await createSaleWithAllocation(3_000, 3_000, fresh.id)
    await settleReceivable(newer.entry.id, 3_000, new Date(2026, 7, 10))

    // Repasse de antes da escolha existir: sem PayoutItem.
    const entry = await prismaAdmin.entry.create({
      data: {
        organizationId: org.id,
        contactId: fresh.id,
        categoryId: org.categoryId,
        type: "PAYABLE",
        description: "Repasse antigo",
        dueDate: new Date(2026, 7, 12),
        amount: 1_500,
        paymentMethod: "PIX",
      },
    })
    await prismaAdmin.payout.create({
      data: { organizationId: org.id, beneficiaryId: fresh.id, entryId: entry.id, amount: 1_500 },
    })

    const credits = await listAvailableCredits(org.id, fresh.id)
    expect(credits).toHaveLength(1)
    expect(credits[0].entryId).toBe(newer.entry.id)
    expect(credits[0].amount).toBe(2_500)
  })

  it("gives every receipt back to the available balance when the payout entry is deleted", async () => {
    const fresh = await newBeneficiary("Excluido")
    const sale = await createSaleWithAllocation(2_500, 2_500, fresh.id)
    await settleReceivable(sale.entry.id, 2_500)
    await payoutAll(fresh.id, new Date(2026, 7, 15))
    expect(await listAvailableCredits(org.id, fresh.id)).toHaveLength(0)

    const payout = await prismaAdmin.payout.findFirstOrThrow({ where: { beneficiaryId: fresh.id } })
    await deleteAccountEntry(org.id, payout.entryId)

    expect(await prismaAdmin.payoutItem.count({ where: { payoutId: payout.id } })).toBe(0)
    const credits = await listAvailableCredits(org.id, fresh.id)
    expect(credits).toHaveLength(1)
    expect(credits[0].amount).toBe(2_500)
    expect(await availableFor(fresh.id)).toMatchObject({ available: 2_500, pending: 0 })
  })
})

describe("listPayoutCredits", () => {
  it("lists exactly the receipts chosen for the payout", async () => {
    const fresh = await newBeneficiary("Composicao")
    const a = await createSaleWithAllocation(1_000, 1_000, fresh.id)
    await settleReceivable(a.entry.id, 1_000, new Date(2026, 7, 1))
    const b = await createSaleWithAllocation(2_000, 2_000, fresh.id)
    await settleReceivable(b.entry.id, 2_000, new Date(2026, 7, 2))

    const chosen = (await listAvailableCredits(org.id, fresh.id)).filter((credit) => credit.entryId === b.entry.id)
    await generatePayout(org.id, {
      beneficiaryId: fresh.id,
      dueDate: new Date(2026, 7, 15),
      credits: chosen.map(({ settlementId, allocationId }) => ({ settlementId, allocationId })),
    })
    const payout = await prismaAdmin.payout.findFirstOrThrow({ where: { beneficiaryId: fresh.id } })

    const credits = await listPayoutCredits(org.id, payout.entryId)
    expect(credits.map((credit) => [credit.entryId, credit.amount])).toEqual([[b.entry.id, 2_000]])
  })

  it("attributes a payout without chosen receipts oldest-first, after the chosen ones", async () => {
    const fresh = await newBeneficiary("ComposicaoLegado")
    const a = await createSaleWithAllocation(1_000, 1_000, fresh.id)
    await settleReceivable(a.entry.id, 1_000, new Date(2026, 7, 1))
    const b = await createSaleWithAllocation(2_000, 2_000, fresh.id)
    await settleReceivable(b.entry.id, 2_000, new Date(2026, 7, 2))

    // Repasse antigo de 1.500, sem PayoutItem: leva o de 1.000 inteiro e 500 do de 2.000.
    const entry = await prismaAdmin.entry.create({
      data: {
        organizationId: org.id,
        contactId: fresh.id,
        categoryId: org.categoryId,
        type: "PAYABLE",
        description: "Repasse antigo",
        dueDate: new Date(2026, 7, 12),
        amount: 1_500,
        paymentMethod: "PIX",
      },
    })
    await prismaAdmin.payout.create({
      data: { organizationId: org.id, beneficiaryId: fresh.id, entryId: entry.id, amount: 1_500 },
    })

    const credits = await listPayoutCredits(org.id, entry.id)
    expect(credits.map((credit) => [credit.entryId, credit.amount])).toEqual([
      [a.entry.id, 1_000],
      [b.entry.id, 500],
    ])
  })
})
