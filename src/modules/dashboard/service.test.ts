import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { createExpense } from "@/modules/expenses/service"
import { generateInstallments } from "@/modules/sales/domain"
import { createSale } from "@/modules/sales/service"
import { createAndSettleTransfer } from "@/modules/settlements/service"
import { getOverview, getPayablesSummary, getReceivablesSummary } from "./service"

let org: TestOrg
let expenseCategoryId: string
let supplierId: string

beforeAll(async () => {
  org = await createTestOrganization("Dashboard")
  const suffix = Date.now()

  const [category, supplier] = await Promise.all([
    prismaAdmin.category.create({
      data: { organizationId: org.id, name: `Despesa dashboard ${suffix}`, type: "EXPENSE" },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Fornecedor dashboard",
        document: `dashboard-supplier-${suffix}`,
        personType: "COMPANY",
        contactType: "SUPPLIER",
      },
    }),
  ])
  expenseCategoryId = category.id
  supplierId = supplier.id
})

afterAll(async () => {
  await removeTestOrganizations([org.id])
})

describe("getReceivablesSummary", () => {
  it("reflects a real Sale's open entries, not mock data", async () => {
    const totalAmount = 50_000
    const firstDueDate = new Date(2026, 8, 1)
    await createSale(org.id, {
      contactId: org.contactId,
      categoryId: org.categoryId,
      bankAccountId: org.bankAccountId,
      description: "Venda dashboard",
      totalAmount,
      paymentMethod: "BOLETO",
      billingType: "INSTALLMENTS",
      installmentsCount: 1,
      billingFrequency: "MONTHLY",
      firstDueDate,
      installments: generateInstallments({ totalAmount, count: 1, firstDueDate, frequency: "MONTHLY" }),
      allocations: [],
    })

    const summary = await getReceivablesSummary(org.id)
    const allItems = [...summary.buckets.vencido.itens, ...summary.buckets.venceHoje.itens, ...summary.buckets.aVencer.itens]
    expect(allItems.some((item) => item.descricao === "Venda dashboard" && item.valor === totalAmount)).toBe(true)
  })
})

describe("getPayablesSummary", () => {
  it("reflects a real despesa's open entries", async () => {
    const totalAmount = 30_000
    const firstDueDate = new Date(2026, 8, 1)
    await createExpense(org.id, {
      contactId: supplierId,
      categoryId: expenseCategoryId,
      bankAccountId: org.bankAccountId,
      description: "Despesa dashboard",
      totalAmount,
      paymentMethod: "PIX",
      billingType: "INSTALLMENTS",
      installmentsCount: 1,
      billingFrequency: "MONTHLY",
      firstDueDate,
      installments: generateInstallments({ totalAmount, count: 1, firstDueDate, frequency: "MONTHLY" }),
    })

    const summary = await getPayablesSummary(org.id)
    const allItems = [...summary.buckets.vencido.itens, ...summary.buckets.venceHoje.itens, ...summary.buckets.aVencer.itens]
    expect(allItems.some((item) => item.descricao === "Despesa dashboard" && item.valor === totalAmount)).toBe(true)
  })

  it("does not mix RECEIVABLE entries into the payables summary", async () => {
    const summary = await getPayablesSummary(org.id)
    const allItems = [...summary.buckets.vencido.itens, ...summary.buckets.venceHoje.itens, ...summary.buckets.aVencer.itens]
    expect(allItems.some((item) => item.descricao === "Venda dashboard")).toBe(false)
  })
})

describe("getOverview", () => {
  it("leaves transfers out of the cash flow, and they don't move the consolidated balance", async () => {
    const counterpart = await prismaAdmin.bankAccount.create({
      data: {
        organizationId: org.id,
        name: "Conta contrária dashboard",
        bank: "Banco de teste",
        branchNumber: "",
        accountNumber: `dashboard-contraria-${Date.now()}`,
        holderType: "COMPANY",
        controlStartDate: new Date(2026, 7, 1),
      },
    })
    const before = await getOverview(org.id)
    const totalBefore = before.accounts.reduce((sum, account) => sum + account.balance, 0)

    const bankImport = await prismaAdmin.import.create({
      data: { organizationId: org.id, bankAccountId: org.bankAccountId, fileName: "dashboard.ofx" },
    })
    const outgoing = await prismaAdmin.bankTransaction.create({
      data: {
        organizationId: org.id,
        bankAccountId: org.bankAccountId,
        importId: bankImport.id,
        bankReference: `ref-dashboard-${Date.now()}`,
        date: new Date(Date.UTC(2026, 8, 3)),
        amount: -6_000,
        description: "Pix enviado",
      },
    })
    await createAndSettleTransfer(org.id, { bankTransactionId: outgoing.id, counterpartBankAccountId: counterpart.id })

    const after = await getOverview(org.id)
    expect(after.realizedByDay.find((day) => day.day === "2026-09-03")).toBeUndefined()
    expect(after.accounts.reduce((sum, account) => sum + account.balance, 0)).toBe(totalBefore)
  })
})
