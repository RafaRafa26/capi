import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { createExpense } from "@/modules/expenses/service"
import { generateInstallments } from "@/modules/sales/domain"
import { createSale } from "@/modules/sales/service"
import { getPayablesSummary, getReceivablesSummary } from "./service"

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
