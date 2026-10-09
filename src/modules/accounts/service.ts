import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import type { UpdateAccountEntryInput, UpdateEntryNotesInput } from "./schema"
import type { AccountContract, AccountEntry, LedgerKind, PaymentMethodCode } from "./types"

const paymentMethodLabel: Record<PaymentMethodCode, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência",
}

/** Everything the accounts screens and the detail Sheet render for one lançamento. */
const ENTRY_INCLUDE = {
  contact: true,
  category: true,
  bankAccount: true,
  marker: { select: { id: true, name: true, color: true } },
  sale: {
    select: {
      id: true,
      totalAmount: true,
      installmentsCount: true,
      billingType: true,
      billingFrequency: true,
      firstDueDate: true,
      allocations: { include: { beneficiary: true }, orderBy: { order: "asc" } },
    },
  },
  settlements: {
    orderBy: { settledAt: "desc" },
    include: { bankTransaction: { include: { bankAccount: true } } },
  },
} as const

type EntryWithRelations = Awaited<ReturnType<typeof loadEntries>>[number]

function loadEntries(tx: Tx, where: { type?: "RECEIVABLE" | "PAYABLE"; id?: string }) {
  return tx.entry.findMany({
    // One query with JOINs instead of ~10 sequential ones (one per relation).
    relationLoadStrategy: "join",
    // Transferência (RN-15) não é conta a receber/pagar — nem buscada por id.
    where: { ...where, type: where.type ?? { in: ["RECEIVABLE", "PAYABLE"] }, status: { not: "CANCELED" } },
    include: ENTRY_INCLUDE,
    orderBy: { dueDate: "asc" },
  })
}

function toAccountEntry(entry: EntryWithRelations, kind: LedgerKind): AccountEntry {
  const allocations = entry.sale?.allocations ?? []
  return {
      id: entry.id,
      kind,
      contactId: entry.contactId ?? "",
      contactName: entry.contact?.name ?? "",
      description: entry.description,
      categoryId: entry.categoryId ?? "",
      categoryName: entry.category?.name ?? "",
      paymentMethod: paymentMethodLabel[entry.paymentMethod as PaymentMethodCode] ?? entry.paymentMethod,
      paymentMethodCode: entry.paymentMethod as PaymentMethodCode,
      bankAccountId: entry.bankAccountId,
      bankAccountName: entry.bankAccount?.name ?? null,
      dueDate: fromDbDate(entry.dueDate),
      paidAt: entry.status === "SETTLED" && entry.settlements[0] ? fromDbDate(entry.settlements[0].settledAt) : null,
      amount: entry.amount,
      settledAmount: entry.settledAmount ?? 0,
      interest: entry.interest,
      fine: entry.fine,
      discount: entry.discount,
      installment:
        entry.sale && entry.sale.billingType === "INSTALLMENTS" && entry.installmentNumber
          ? `${entry.installmentNumber}/${entry.sale.installmentsCount}`
          : undefined,
      installmentNumber: entry.installmentNumber ?? undefined,
      settlements: entry.settlements.map((settlement) => ({
        id: settlement.id,
        settledAt: fromDbDate(settlement.settledAt),
        settledAmount: settlement.settledAmount,
        interest: settlement.interest,
        fine: settlement.fine,
        discount: settlement.discount,
        note: settlement.note,
        bankAccountName: settlement.bankTransaction?.bankAccount.name ?? null,
      })),
      contract: entry.sale
        ? {
            saleId: entry.sale.id,
            modality: entry.sale.billingType as AccountContract["modality"],
            totalAmount: entry.sale.totalAmount,
            installmentsCount: entry.sale.installmentsCount,
            billingFrequency: entry.sale.billingFrequency as AccountContract["billingFrequency"],
            firstDueDate: fromDbDate(entry.sale.firstDueDate),
          }
        : undefined,
      allocationMode: allocations[0]?.mode as AccountEntry["allocationMode"],
      allocations: allocations.map((allocation) => ({
        beneficiaryId: allocation.beneficiaryId,
        beneficiaryName: allocation.beneficiary.name,
        percentage: allocation.percentage,
        amount: allocation.amount,
      })),
      // Favorecidos (RN-04): who the sale's repasse pays out to — independent
      // of `contactId` above, which is the client/fornecedor on the entry
      // itself. Avulsa entries (no sale) or a sale with no Allocation rows
      // have none, per ARQUITETURA.md §5.1.
      beneficiaryIds: allocations.map((allocation) => allocation.beneficiaryId),
    beneficiaryNames: allocations.map((allocation) => allocation.beneficiary.name),
    entryStatus: entry.status as AccountEntry["entryStatus"],
    marker: entry.marker,
    notes: entry.notes,
    notesUpdatedAt: entry.notesUpdatedAt,
  }
}

/** Every PAYABLE entry (despesas avulsas/parceladas + Sale-generated), for the Contas a pagar screen. */
export async function listPayables(organizationId: string): Promise<AccountEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const entries = await loadEntries(tx, { type: "PAYABLE" })
    return entries.map((entry) => toAccountEntry(entry, "pay"))
  })
}

/** Every RECEIVABLE entry (Sale installments + avulsas), for the Contas a receber screen. */
export async function listReceivables(organizationId: string): Promise<AccountEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const entries = await loadEntries(tx, { type: "RECEIVABLE" })
    return entries.map((entry) => toAccountEntry(entry, "rec"))
  })
}

/**
 * One lançamento with the same shape the lists use — so the detail Sheet can
 * be opened from somewhere that didn't load the whole ledger, like the
 * favorecido's extrato drilling into the conta a receber that credited him.
 */
export async function getAccountEntryById(organizationId: string, entryId: string): Promise<AccountEntry> {
  return withOrganization(organizationId, async (tx) => {
    const [entry] = await loadEntries(tx, { id: entryId })
    if (!entry) throw new NotFound("Lançamento")
    return toAccountEntry(entry, entry.type === "PAYABLE" ? "pay" : "rec")
  })
}

/** All Favorecido contacts registered in the org — the full universe for the Favorecido filter, not just the ones already used in an entry. */
export async function listBeneficiaries(organizationId: string): Promise<{ id: string; name: string }[]> {
  return withOrganization(organizationId, (tx) =>
    tx.contact.findMany({
      where: { contactType: "BENEFICIARY" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  )
}

/**
 * Edits a lançamento's own fields. `dueDate`/`amount` only take effect while
 * the entry is still FORECAST (RN-17) — once money has moved against it
 * (PARTIAL/SETTLED), changing them would drift from what was actually
 * settled, so they're silently kept as they are instead of erroring the
 * whole save.
 */
export async function updateAccountEntry(
  organizationId: string,
  entryId: string,
  input: UpdateAccountEntryInput,
): Promise<void> {
  return withOrganization(organizationId, async (tx) => {
    const entry = await tx.entry.findUnique({ where: { id: entryId } })
    if (!entry) throw new NotFound("Lançamento")

    const category = await tx.category.findUnique({ where: { id: input.categoryId } })
    if (!category) throw new NotFound("Categoria")
    const expectedCategoryType = entry.type === "RECEIVABLE" ? "INCOME" : "EXPENSE"
    if (category.type !== expectedCategoryType) {
      throw new BusinessError(
        entry.type === "RECEIVABLE" ? "A categoria selecionada não é de receita." : "A categoria selecionada não é de despesa.",
        "categoryId",
      )
    }

    const contact = await tx.contact.findUnique({ where: { id: input.contactId } })
    if (!contact) throw new NotFound("Contato")

    if (input.bankAccountId) {
      const bankAccount = await tx.bankAccount.findUnique({ where: { id: input.bankAccountId } })
      if (!bankAccount) throw new NotFound("Conta bancária")
    }

    await tx.entry.update({
      where: { id: entryId },
      data: {
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        description: input.description,
        paymentMethod: input.paymentMethod,
        ...(entry.status === "FORECAST" ? { dueDate: input.dueDate, amount: input.amount } : {}),
      },
    })
  })
}

/**
 * Marcador e observação de um lançamento (RN-36) — salvos pela listagem sem
 * abrir o lançamento, em qualquer situação, inclusive já liquidado. O
 * marcador precisa ser do mesmo lado (a receber/a pagar) do lançamento.
 */
export async function updateEntryNotes(
  organizationId: string,
  entryId: string,
  input: UpdateEntryNotesInput,
): Promise<void> {
  return withOrganization(organizationId, async (tx) => {
    const entry = await tx.entry.findUnique({ where: { id: entryId } })
    if (!entry || entry.status === "CANCELED") throw new NotFound("Lançamento")

    if (input.markerId) {
      const marker = await tx.marker.findUnique({ where: { id: input.markerId } })
      if (!marker) throw new NotFound("Marcador")
      if (marker.type !== entry.type) {
        throw new BusinessError("Esse marcador não é deste tipo de lançamento.", "markerId")
      }
    }

    const changed = (input.markerId ?? null) !== entry.markerId || (input.notes ?? null) !== entry.notes
    if (!changed) return

    await tx.entry.update({
      where: { id: entryId },
      data: { markerId: input.markerId, notes: input.notes, notesUpdatedAt: new Date() },
    })
  })
}

/** Recomputes and persists a bank transaction's status from its remaining Settlement rows. */
async function reconcileBankTransactionStatus(tx: Tx, bankTransactionId: string) {
  const count = await tx.settlement.count({ where: { bankTransactionId } })
  await tx.bankTransaction.update({
    where: { id: bankTransactionId },
    data: { status: count > 0 ? "RECONCILED" : "PENDING" },
  })
}

/**
 * Excluir (detail Sheet): only ever offered for a still-open lançamento (A
 * vencer/Vence hoje/Vencido) — a SETTLED one is rejected here too, in case
 * the status changed between render and click.
 */
export async function deleteAccountEntry(organizationId: string, entryId: string): Promise<void> {
  return withOrganization(organizationId, async (tx) => {
    const entry = await tx.entry.findUnique({ where: { id: entryId } })
    if (!entry) throw new NotFound("Lançamento")
    if (entry.status === "SETTLED") {
      throw new BusinessError("Não é possível excluir um lançamento já conciliado.")
    }

    const settlements = await tx.settlement.findMany({ where: { entryId } })
    const bankTransactionIds = [...new Set(settlements.map((s) => s.bankTransactionId).filter((id): id is string => id !== null))]

    await tx.settlement.deleteMany({ where: { entryId } })
    await tx.entry.delete({ where: { id: entryId } })

    for (const bankTransactionId of bankTransactionIds) {
      await reconcileBankTransactionStatus(tx, bankTransactionId)
    }
  })
}
