import "server-only"

import { withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import type { ExpenseInput } from "./schema"
import type { Expense } from "./types"

async function loadContact(tx: Tx, contactId: string) {
  const contact = await tx.contact.findUnique({ where: { id: contactId } })
  if (!contact) throw new NotFound("Contato")
  return contact
}

async function loadExpenseCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new NotFound("Categoria")
  if (category.type !== "EXPENSE") {
    throw new BusinessError("A categoria selecionada não é de despesa.", "categoryId")
  }
  return category
}

async function loadBankAccount(tx: Tx, bankAccountId: string) {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new NotFound("Conta bancária")
  return bankAccount
}

/**
 * Creates a despesa (conta a pagar) — one or more standalone PAYABLE entries,
 * avulsa/parcelada/recorrente, with no contact-type restriction (unlike
 * createSale's CLIENT check): a despesa can be paid to a fornecedor,
 * funcionário, sócio, whoever the organization actually owes.
 *
 * Unlike Venda, there's no grouping entity here — each installment is an
 * independent Entry, exactly as ARQUITETURA.md's Lancamento avulso describes.
 */
export async function createExpense(organizationId: string, input: ExpenseInput): Promise<Expense> {
  return withOrganization(organizationId, async (tx) => {
    await loadContact(tx, input.contactId)
    await loadExpenseCategory(tx, input.categoryId)
    await loadBankAccount(tx, input.bankAccountId)

    // RN-17 only applies to INSTALLMENTS, where `totalAmount` is a total to
    // divide — see sales/service.ts#createSale for the same rule.
    if (input.billingType === "INSTALLMENTS") {
      const installmentsTotal = input.installments.reduce((sum, i) => sum + i.amount, 0)
      if (installmentsTotal !== input.totalAmount) {
        throw new BusinessError(
          "A soma das parcelas deve corresponder ao valor total da despesa.",
          "installments",
        )
      }
    }

    const entries = []
    for (const installment of input.installments) {
      const entry = await tx.entry.create({
        data: {
          organizationId,
          contactId: input.contactId,
          categoryId: input.categoryId,
          bankAccountId: input.bankAccountId,
          type: "PAYABLE",
          description: input.description,
          dueDate: installment.dueDate,
          amount: installment.amount,
          paymentMethod: input.paymentMethod,
        },
      })
      entries.push(entry)
    }

    return {
      contactId: input.contactId,
      categoryId: input.categoryId,
      bankAccountId: input.bankAccountId,
      description: input.description,
      totalAmount: input.totalAmount,
      paymentMethod: input.paymentMethod,
      billingType: input.billingType,
      installmentsCount: input.installmentsCount,
      billingFrequency: input.billingFrequency,
      firstDueDate: input.firstDueDate,
      recurrenceEndDate: input.billingType === "RECURRING" ? (input.recurrenceEndDate ?? null) : null,
      entries: entries.map((entry, index) => ({
        installmentNumber: index + 1,
        dueDate: entry.dueDate,
        amount: entry.amount,
      })),
    }
  })
}
