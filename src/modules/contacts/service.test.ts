import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { prismaAdmin } from "@/db/client"
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment"
import { contactInputSchema, type ContactInput } from "./schema"
import { createContact, getContact, updateContact } from "./service"

let org: TestOrg
let otherOrg: TestOrg
let suffix: number

const bankDetails = {
  pixKey: "ana@example.test",
  bank: "Banco",
  branchNumber: "0001",
  accountNumber: "123",
  accountType: "Corrente",
  accountHolder: "Ana",
}

beforeAll(async () => {
  org = await createTestOrganization("Contacts")
  otherOrg = await createTestOrganization("Contacts other")
  suffix = Date.now()
})

afterAll(async () => {
  await removeTestOrganizations([org.id, otherOrg.id])
})

function beneficiaryInput(document: string, overrides: Partial<ContactInput> = {}): ContactInput {
  return {
    name: "Ana Favorecida",
    document,
    personType: "INDIVIDUAL",
    contactType: "BENEFICIARY",
    bankDetails,
    ...overrides,
  }
}

async function createBeneficiary(document: string) {
  return prismaAdmin.contact.create({
    data: {
      organizationId: org.id,
      name: "Ana",
      document,
      personType: "INDIVIDUAL",
      contactType: "BENEFICIARY",
      bankDetails,
    },
  })
}

describe("createContact", () => {
  it("only requires the name", () => {
    const parsed = contactInputSchema.safeParse({ name: "", personType: "COMPANY", contactType: "BENEFICIARY" })
    expect(parsed.error?.issues.map((issue) => issue.path[0])).toEqual(["name"])
  })

  it("lets several contacts go without a document", async () => {
    const input = contactInputSchema.parse({ name: "Sem doc", document: "", personType: "INDIVIDUAL", contactType: "CLIENT" })
    const first = await createContact(org.id, input)
    const second = await createContact(org.id, input)
    expect([first.document, second.document]).toEqual([null, null])
  })

  it("saves a favorecido with partial bank details, and none at all as null", async () => {
    const partial = await createContact(
      org.id,
      contactInputSchema.parse({
        name: "Favorecido parcial",
        personType: "COMPANY",
        contactType: "BENEFICIARY",
        bankDetails: { pixKey: "pix@example.test", bank: "" },
      }),
    )
    expect(partial).toMatchObject({
      legalName: null,
      bankDetails: { pixKey: "pix@example.test", bank: "", branchNumber: "", accountNumber: "", accountType: "", accountHolder: "" },
    })

    const empty = await createContact(
      org.id,
      contactInputSchema.parse({
        name: "Favorecido sem banco",
        personType: "INDIVIDUAL",
        contactType: "BENEFICIARY",
        bankDetails: { pixKey: "", bank: "" },
      }),
    )
    expect(empty.bankDetails).toBeNull()
  })
})

describe("updateContact", () => {
  it("completes a quick-added contact that had no document yet", async () => {
    const quick = await prismaAdmin.contact.create({
      data: { organizationId: org.id, name: "Rápido", personType: "INDIVIDUAL", contactType: "CLIENT" },
    })

    await updateContact(org.id, quick.id, {
      name: "Rápido Completo",
      legalName: "Rápido Ltda",
      document: `cnpj-${suffix}`,
      personType: "COMPANY",
      contactType: "SUPPLIER",
      email: "rapido@example.test",
    })

    expect(await getContact(org.id, quick.id)).toMatchObject({
      name: "Rápido Completo",
      legalName: "Rápido Ltda",
      document: `cnpj-${suffix}`,
      personType: "COMPANY",
      contactType: "SUPPLIER",
      email: "rapido@example.test",
      phone: null,
      bankDetails: null,
    })
  })

  it("rejects a document that another contact already has", async () => {
    const contact = await createBeneficiary(`dup-${suffix}`)
    const taken = await prismaAdmin.contact.findUniqueOrThrow({ where: { id: org.contactId } })

    await expect(updateContact(org.id, contact.id, beneficiaryInput(taken.document!))).rejects.toThrow(
      "Já existe um contato com esse documento.",
    )
  })

  it("lets a favorecido with nothing linked change type", async () => {
    const contact = await createBeneficiary(`free-${suffix}`)

    await updateContact(org.id, contact.id, beneficiaryInput(`free-${suffix}`, { contactType: "CLIENT" }))

    expect(await getContact(org.id, contact.id)).toMatchObject({ contactType: "CLIENT", bankDetails: null })
  })

  it("keeps a favorecido that already has a sale split to it as a favorecido", async () => {
    const contact = await createBeneficiary(`linked-${suffix}`)
    const sale = await prismaAdmin.sale.create({
      data: {
        organizationId: org.id,
        contactId: org.contactId,
        categoryId: org.categoryId,
        bankAccountId: org.bankAccountId,
        description: "Venda com rateio",
        totalAmount: 10_000,
        paymentMethod: "PIX",
        firstDueDate: new Date(2026, 9, 1),
      },
    })
    await prismaAdmin.allocation.create({
      data: { organizationId: org.id, saleId: sale.id, beneficiaryId: contact.id, mode: "FIXED_AMOUNT", amount: 10_000, order: 0 },
    })

    await expect(
      updateContact(org.id, contact.id, beneficiaryInput(`linked-${suffix}`, { contactType: "CLIENT" })),
    ).rejects.toThrow("não dá para trocar o tipo")

    // Os outros dados continuam editáveis.
    await updateContact(org.id, contact.id, beneficiaryInput(`linked-${suffix}`, { name: "Ana Souza" }))
    expect(await getContact(org.id, contact.id)).toMatchObject({ name: "Ana Souza", contactType: "BENEFICIARY" })
  })

  it("can't touch another organization's contact", async () => {
    await expect(updateContact(otherOrg.id, org.contactId, beneficiaryInput(`x-${suffix}`))).rejects.toThrow("not found")
  })
})
