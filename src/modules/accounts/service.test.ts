import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { manualSettleEntry } from "@/modules/settlements/service"
import { BusinessError, NotFound } from "@/shared/errors"
import { deleteAccountEntry, listBeneficiaries, listPayables, updateAccountEntry } from "./service"

let org: TestOrg
let expenseCategoryId: string
let supplierId: string
let beneficiaryId: string

beforeAll(async () => {
  org = await createTestOrganization("Accounts")
  const suffix = Date.now()

  const [expenseCategory, supplier, beneficiary] = await Promise.all([
    prismaAdmin.category.create({
      data: { organizationId: org.id, name: `Despesa de teste ${suffix}`, type: "EXPENSE" },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Fornecedor Teste",
        document: `supplier-${suffix}`,
        personType: "COMPANY",
        contactType: "SUPPLIER",
      },
    }),
    prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: "Favorecido Teste",
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

function createPayableEntry() {
  return prismaAdmin.entry.create({
    data: {
      organizationId: org.id,
      contactId: supplierId,
      categoryId: expenseCategoryId,
      bankAccountId: org.bankAccountId,
      type: "PAYABLE",
      description: "Despesa de teste",
      dueDate: new Date(2026, 8, 10),
      amount: 10_000,
      paymentMethod: "BOLETO",
    },
  })
}

describe("listPayables", () => {
  it("maps an avulsa entry's fields, with no favorecido", async () => {
    const entry = await createPayableEntry()

    const entries = await listPayables(org.id)
    const mapped = entries.find((e) => e.id === entry.id)

    expect(mapped).toBeDefined()
    expect(mapped?.contactName).toBe("Fornecedor Teste")
    expect(mapped?.categoryName).toMatch(/^Despesa de teste/)
    expect(mapped?.paymentMethod).toBe("Boleto")
    expect(mapped?.paymentMethodCode).toBe("BOLETO")
    expect(mapped?.beneficiaryNames).toEqual([])
    expect(mapped?.entryStatus).toBe("FORECAST")
  })
})

describe("listBeneficiaries", () => {
  it("returns only BENEFICIARY contacts, not the supplier", async () => {
    const beneficiaries = await listBeneficiaries(org.id)
    const ids = beneficiaries.map((b) => b.id)

    expect(ids).toContain(beneficiaryId)
    expect(ids).not.toContain(supplierId)
  })
})

describe("updateAccountEntry", () => {
  it("updates every editable field while the entry is FORECAST", async () => {
    const entry = await createPayableEntry()

    await updateAccountEntry(org.id, entry.id, {
      contactId: org.contactId,
      categoryId: expenseCategoryId,
      bankAccountId: org.bankAccountId,
      description: "Descrição editada",
      paymentMethod: "PIX",
      dueDate: new Date(2026, 9, 1),
      amount: 15_000,
    })

    const updated = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updated.description).toBe("Descrição editada")
    expect(updated.contactId).toBe(org.contactId)
    expect(updated.paymentMethod).toBe("PIX")
    expect(updated.amount).toBe(15_000)
    expect(updated.dueDate.toISOString().slice(0, 10)).toBe("2026-10-01")
  })

  it("keeps dueDate and amount unchanged once the entry is SETTLED (RN-17)", async () => {
    const entry = await createPayableEntry()
    await manualSettleEntry(org.id, { entryId: entry.id, settledAt: new Date(2026, 8, 11) })

    await updateAccountEntry(org.id, entry.id, {
      contactId: supplierId,
      categoryId: expenseCategoryId,
      bankAccountId: org.bankAccountId,
      description: "Nova descrição pós-liquidação",
      paymentMethod: "PIX",
      dueDate: new Date(2026, 11, 25),
      amount: 999_999,
    })

    const updated = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } })
    expect(updated.description).toBe("Nova descrição pós-liquidação")
    expect(updated.paymentMethod).toBe("PIX")
    expect(updated.amount).toBe(10_000)
    expect(updated.dueDate.toISOString().slice(0, 10)).toBe("2026-09-10")
  })

  it("rejects a category whose type doesn't match the entry's direction", async () => {
    const entry = await createPayableEntry()

    await expect(
      updateAccountEntry(org.id, entry.id, {
        contactId: supplierId,
        categoryId: org.categoryId, // INCOME category — entry is PAYABLE
        bankAccountId: org.bankAccountId,
        description: entry.description,
        paymentMethod: "BOLETO",
        dueDate: entry.dueDate,
        amount: entry.amount,
      }),
    ).rejects.toBeInstanceOf(BusinessError)
  })

  it("throws NotFound for a nonexistent entry", async () => {
    await expect(
      updateAccountEntry(org.id, "00000000-0000-0000-0000-000000000000", {
        contactId: supplierId,
        categoryId: expenseCategoryId,
        bankAccountId: org.bankAccountId,
        description: "x",
        paymentMethod: "PIX",
        dueDate: new Date(),
        amount: 100,
      }),
    ).rejects.toBeInstanceOf(NotFound)
  })
})

describe("deleteAccountEntry", () => {
  it("removes a still-open entry", async () => {
    const entry = await createPayableEntry()

    await deleteAccountEntry(org.id, entry.id)

    await expect(prismaAdmin.entry.findUnique({ where: { id: entry.id } })).resolves.toBeNull()
  })

  it("rejects a SETTLED entry", async () => {
    const entry = await createPayableEntry()
    await manualSettleEntry(org.id, { entryId: entry.id, settledAt: new Date(2026, 8, 11) })

    await expect(deleteAccountEntry(org.id, entry.id)).rejects.toBeInstanceOf(BusinessError)
    await expect(prismaAdmin.entry.findUnique({ where: { id: entry.id } })).resolves.not.toBeNull()
  })

  it("throws NotFound for a nonexistent entry", async () => {
    await expect(deleteAccountEntry(org.id, "00000000-0000-0000-0000-000000000000")).rejects.toBeInstanceOf(NotFound)
  })
})
