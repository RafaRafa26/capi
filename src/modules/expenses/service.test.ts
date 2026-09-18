import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import {
  generateInstallments,
  generateRecurringInstallments,
  RECURRING_ROLLING_WINDOW,
} from "@/modules/sales/domain"
import { BusinessError, NotFound } from "@/shared/errors"
import { createExpense } from "./service"

let org: TestOrg
let expenseCategoryId: string
let supplierId: string

beforeAll(async () => {
  org = await createTestOrganization("Expenses")
  const suffix = Date.now()

  const [category, supplier] = await Promise.all([
    prismaAdmin.category.create({
      data: { organizationId: org.id, name: `Despesa de teste ${suffix}`, type: "EXPENSE" },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Fornecedor de teste",
        document: `supplier-${suffix}`,
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

function baseInput() {
  const totalAmount = 300_000
  const installmentsCount = 3
  const billingFrequency = "MONTHLY" as const
  const firstDueDate = new Date(2026, 8, 10)

  return {
    contactId: supplierId,
    categoryId: expenseCategoryId,
    bankAccountId: org.bankAccountId,
    description: "Despesa de teste",
    totalAmount,
    paymentMethod: "BOLETO" as const,
    billingType: "INSTALLMENTS" as const,
    installmentsCount,
    billingFrequency,
    firstDueDate,
    installments: generateInstallments({
      totalAmount,
      count: installmentsCount,
      firstDueDate,
      frequency: billingFrequency,
    }),
  }
}

describe("createExpense", () => {
  it("creates a despesa in 3x that sums exactly to the total", async () => {
    const expense = await createExpense(org.id, baseInput())

    expect(expense.entries).toHaveLength(3)
    expect(expense.entries.reduce((sum, e) => sum + e.amount, 0)).toBe(300_000)
  })

  it("persists each installment as an independent PAYABLE entry, with no saleId", async () => {
    const expense = await createExpense(org.id, { ...baseInput(), installmentsCount: 1 })

    const entries = await prismaAdmin.entry.findMany({
      where: { organizationId: org.id, contactId: supplierId, type: "PAYABLE" },
      orderBy: { dueDate: "desc" },
      take: 1,
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].saleId).toBeNull()
    expect(entries[0].installmentNumber).toBeNull()
    expect(entries[0].status).toBe("FORECAST")
    expect(entries[0].amount).toBe(expense.entries[0].amount)
  })

  it("accepts any contact type, not just SUPPLIER", async () => {
    const expense = await createExpense(org.id, { ...baseInput(), contactId: org.contactId })
    expect(expense.entries).toHaveLength(3)
  })

  it("rejects a category that isn't EXPENSE", async () => {
    const incomeCategory = await prismaAdmin.category.create({
      data: { organizationId: org.id, name: "Receita de teste", type: "INCOME" },
    })

    await expect(
      createExpense(org.id, { ...baseInput(), categoryId: incomeCategory.id }),
    ).rejects.toThrow(BusinessError)
  })

  it("rejects a nonexistent bank account", async () => {
    await expect(
      createExpense(org.id, {
        ...baseInput(),
        bankAccountId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow(NotFound)
  })

  it("rejects a nonexistent contact", async () => {
    await expect(
      createExpense(org.id, {
        ...baseInput(),
        contactId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toThrow(NotFound)
  })

  it("rejects installments that don't sum to the despesa's total", async () => {
    const input = baseInput()
    input.installments[0] = { ...input.installments[0], amount: input.installments[0].amount + 1 }

    await expect(createExpense(org.id, input)).rejects.toThrow(BusinessError)
  })

  it("creates an indeterminate recurring despesa with the rolling window of entries", async () => {
    const amountPerOccurrence = 15_000
    const firstDueDate = new Date(2026, 8, 5)
    const frequency = "MONTHLY" as const

    const expense = await createExpense(org.id, {
      ...baseInput(),
      totalAmount: amountPerOccurrence,
      billingType: "RECURRING",
      billingFrequency: frequency,
      firstDueDate,
      recurrenceEndDate: null,
      installmentsCount: RECURRING_ROLLING_WINDOW,
      installments: generateRecurringInstallments({
        amountPerOccurrence,
        firstDueDate,
        frequency,
        endDate: null,
      }),
    })

    expect(expense.recurrenceEndDate).toBeNull()
    expect(expense.entries).toHaveLength(RECURRING_ROLLING_WINDOW)
    expect(expense.entries.every((e) => e.amount === amountPerOccurrence)).toBe(true)
  })
})
