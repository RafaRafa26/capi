import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import { computeBeneficiaryShare, directionForTransactionAmount, recomputeEntryAggregate, suggestMatches } from "./domain"
import type {
  CreateAndSettlePayableInput,
  CreateSettlementBatchInput,
  CreateSettlementInput,
  ManualSettleInput,
  SearchCandidateEntriesInput,
} from "./schema"
import type { CandidateEntry, MatchedSettlement, TransactionMatchInfo } from "./types"

async function loadEntry(tx: Tx, entryId: string) {
  const entry = await tx.entry.findUnique({ where: { id: entryId } })
  if (!entry) throw new NotFound("Lançamento")
  return entry
}

async function loadBankTransaction(tx: Tx, bankTransactionId: string) {
  const transaction = await tx.bankTransaction.findUnique({ where: { id: bankTransactionId } })
  if (!transaction) throw new NotFound("Transação bancária")
  return transaction
}

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

async function loadIncomeCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new NotFound("Categoria")
  if (category.type !== "INCOME") {
    throw new BusinessError("A categoria selecionada não é de receita.", "categoryId")
  }
  return category
}

async function loadBankAccount(tx: Tx, bankAccountId: string) {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new NotFound("Conta bancária")
  return bankAccount
}

/** Recomputes and persists an Entry's aggregate from its full Settlement history. */
async function reconcileEntryAggregate(tx: Tx, entryId: string) {
  const [entry, settlements] = await Promise.all([
    tx.entry.findUniqueOrThrow({ where: { id: entryId } }),
    tx.settlement.findMany({ where: { entryId } }),
  ])
  const aggregate = recomputeEntryAggregate(settlements, entry.amount)
  await tx.entry.update({ where: { id: entryId }, data: aggregate })
}

/** RECONCILED as long as the transaction has at least one Settlement, PENDING otherwise. */
async function reconcileBankTransactionStatus(tx: Tx, bankTransactionId: string) {
  const count = await tx.settlement.count({ where: { bankTransactionId } })
  await tx.bankTransaction.update({
    where: { id: bankTransactionId },
    data: { status: count > 0 ? "RECONCILED" : "PENDING" },
  })
}

interface InsertSettlementInput {
  entryId: string
  bankTransactionId?: string
  origin: "STATEMENT" | "MANUAL"
  settledAmount: number
  interest?: number
  fine?: number
  discount?: number
  settledAt: Date
  note?: string
}

async function insertSettlement(tx: Tx, organizationId: string, input: InsertSettlementInput) {
  await loadEntry(tx, input.entryId)
  if (input.bankTransactionId) await loadBankTransaction(tx, input.bankTransactionId)

  await tx.settlement.create({
    data: {
      organizationId,
      entryId: input.entryId,
      bankTransactionId: input.bankTransactionId ?? null,
      origin: input.origin,
      settledAmount: input.settledAmount,
      interest: input.interest ?? 0,
      fine: input.fine ?? 0,
      discount: input.discount ?? 0,
      settledAt: input.settledAt,
      note: input.note ?? null,
    },
  })

  await reconcileEntryAggregate(tx, input.entryId)
  if (input.bankTransactionId) await reconcileBankTransactionStatus(tx, input.bankTransactionId)
}

function toCandidateEntry(entry: { id: string; contact: { name: string }; description: string; dueDate: Date; amount: number; settledAmount: number | null; type: CandidateEntry["type"] }): CandidateEntry {
  return {
    id: entry.id,
    contactName: entry.contact.name,
    description: entry.description,
    dueDate: fromDbDate(entry.dueDate),
    amount: entry.amount,
    settledAmount: entry.settledAmount,
    type: entry.type,
  }
}

/** For the "Buscar existente" tab — open entries of the given direction, optionally filtered by text. */
export async function listCandidateEntries(
  organizationId: string,
  input: SearchCandidateEntriesInput,
): Promise<CandidateEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const entries = await tx.entry.findMany({
      where: {
        type: input.type,
        status: { in: ["FORECAST", "PARTIAL"] },
        ...(input.query
          ? {
              OR: [
                { description: { contains: input.query, mode: "insensitive" } },
                { contact: { name: { contains: input.query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    })
    return entries.map(toCandidateEntry)
  })
}

/** Automatic suggestion banner — exact-amount matches for one bank transaction. */
export async function suggestMatchesForTransaction(
  organizationId: string,
  bankTransactionId: string,
): Promise<CandidateEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const transaction = await loadBankTransaction(tx, bankTransactionId)
    const openEntries = await tx.entry.findMany({
      where: { type: directionForTransactionAmount(transaction.amount), status: { in: ["FORECAST", "PARTIAL"] } },
      include: { contact: true },
    })

    const rankable = openEntries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      settledAmount: entry.settledAmount,
      dueDate: fromDbDate(entry.dueDate),
    }))
    const matches = suggestMatches(transaction.amount, fromDbDate(transaction.date), rankable)
    const byId = new Map(openEntries.map((entry) => [entry.id, entry]))
    return matches.map((match) => toCandidateEntry(byId.get(match.id)!))
  })
}

/**
 * What the reconciliation screen needs to render each bank transaction's
 * "Capi" side in one round trip: entries it's already settled against, or —
 * when it isn't settled yet — its automatic match suggestions. Reused for
 * both the initial load and refreshing after an action, so the screen never
 * has to special-case which one it's showing.
 */
export async function getMatchInfoForTransactions(
  organizationId: string,
  bankTransactionIds: string[],
): Promise<TransactionMatchInfo[]> {
  return withOrganization(organizationId, async (tx) => {
    if (bankTransactionIds.length === 0) return []

    const [transactions, settlements] = await Promise.all([
      tx.bankTransaction.findMany({ where: { id: { in: bankTransactionIds } } }),
      tx.settlement.findMany({
        where: { bankTransactionId: { in: bankTransactionIds } },
        include: { entry: { include: { contact: true, category: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const settlementsByTransaction = new Map<string, MatchedSettlement[]>()
    for (const settlement of settlements) {
      const key = settlement.bankTransactionId!
      const list = settlementsByTransaction.get(key) ?? []
      list.push({
        settlementId: settlement.id,
        entryId: settlement.entryId,
        entryType: settlement.entry.type,
        contactName: settlement.entry.contact.name,
        description: settlement.entry.description,
        categoryName: settlement.entry.category.name,
        dueDate: fromDbDate(settlement.entry.dueDate),
        settledAmount: settlement.settledAmount,
      })
      settlementsByTransaction.set(key, list)
    }

    const unmatched = transactions.filter((t) => !settlementsByTransaction.has(t.id))
    const needsReceivables = unmatched.some((t) => directionForTransactionAmount(t.amount) === "RECEIVABLE")
    const needsPayables = unmatched.some((t) => directionForTransactionAmount(t.amount) === "PAYABLE")

    const [receivableEntries, payableEntries] = await Promise.all([
      needsReceivables
        ? tx.entry.findMany({ where: { type: "RECEIVABLE", status: { in: ["FORECAST", "PARTIAL"] } }, include: { contact: true } })
        : Promise.resolve([]),
      needsPayables
        ? tx.entry.findMany({ where: { type: "PAYABLE", status: { in: ["FORECAST", "PARTIAL"] } }, include: { contact: true } })
        : Promise.resolve([]),
    ])

    return transactions.map((transaction) => {
      const matches = settlementsByTransaction.get(transaction.id) ?? []
      if (matches.length > 0) return { bankTransactionId: transaction.id, matches, suggestions: [] }

      const pool = directionForTransactionAmount(transaction.amount) === "RECEIVABLE" ? receivableEntries : payableEntries
      const rankable = pool.map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        settledAmount: entry.settledAmount,
        dueDate: fromDbDate(entry.dueDate),
      }))
      const suggested = suggestMatches(transaction.amount, fromDbDate(transaction.date), rankable)
      const byId = new Map(pool.map((entry) => [entry.id, entry]))
      return {
        bankTransactionId: transaction.id,
        matches: [],
        suggestions: suggested.map((s) => toCandidateEntry(byId.get(s.id)!)),
      }
    })
  })
}

/** Links one bank transaction to one existing entry (RN-01, extrato path). */
export async function createSettlement(organizationId: string, input: CreateSettlementInput): Promise<void> {
  await withOrganization(organizationId, (tx) =>
    insertSettlement(tx, organizationId, { ...input, origin: "STATEMENT" }),
  )
}

/** Quitação múltipla (RN-07) — one bank transaction settling several entries at once. */
export async function createSettlementBatch(organizationId: string, input: CreateSettlementBatchInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadBankTransaction(tx, input.bankTransactionId)
    for (const item of input.items) {
      await insertSettlement(tx, organizationId, { ...item, bankTransactionId: input.bankTransactionId, origin: "STATEMENT" })
    }
  })
}

/** Desfazer (RN-12/RN-22) — removing the Settlement row and recomputing is enough, there's no ledger to reverse. */
export async function undoSettlement(organizationId: string, settlementId: string): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const settlement = await tx.settlement.findUnique({ where: { id: settlementId } })
    if (!settlement) throw new NotFound("Conciliação")

    await tx.settlement.delete({ where: { id: settlementId } })
    await reconcileEntryAggregate(tx, settlement.entryId)
    if (settlement.bankTransactionId) await reconcileBankTransactionStatus(tx, settlement.bankTransactionId)
  })
}

/**
 * Baixa manual — date + free-text note only, quits whatever remains of the
 * entry in one go (no partial baixa manual, to keep this simple), never
 * touches a bank transaction and never credits a favorecido (RN-01a: only a
 * STATEMENT-origin settlement generates balance).
 */
export async function manualSettleEntry(organizationId: string, input: ManualSettleInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const entry = await loadEntry(tx, input.entryId)
    const remaining = entry.amount - (entry.settledAmount ?? 0)
    if (remaining <= 0) {
      throw new BusinessError("Este lançamento já está totalmente liquidado.")
    }

    await insertSettlement(tx, organizationId, {
      entryId: input.entryId,
      origin: "MANUAL",
      settledAmount: remaining,
      settledAt: input.settledAt,
      note: input.note,
    })
  })
}

/**
 * The reconciliation screen's "create a payment" path — a saída with no
 * existing candidate becomes a standalone PAYABLE entry, created already
 * settled by that same transaction. Mirrors expenses/service.ts#createExpense
 * for a single, already-paid installment.
 */
export async function createAndSettlePayable(organizationId: string, input: CreateAndSettlePayableInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadContact(tx, input.contactId)
    await loadExpenseCategory(tx, input.categoryId)
    await loadBankAccount(tx, input.bankAccountId)
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)

    const entry = await tx.entry.create({
      data: {
        organizationId,
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        type: "PAYABLE",
        description: input.description,
        dueDate: transaction.date,
        amount: input.settledAmount,
        paymentMethod: "BANK_TRANSFER",
      },
    })

    await insertSettlement(tx, organizationId, {
      entryId: entry.id,
      bankTransactionId: input.bankTransactionId,
      origin: "STATEMENT",
      settledAmount: input.settledAmount,
      settledAt: input.settledAt,
    })
  })
}

/**
 * The reconciliation screen's "create a receipt" path — an entrada with no
 * existing candidate becomes a standalone RECEIVABLE entry, created already
 * settled by that same transaction. Mirrors createAndSettlePayable above,
 * INCOME category instead of EXPENSE.
 */
export async function createAndSettleReceivable(organizationId: string, input: CreateAndSettlePayableInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadContact(tx, input.contactId)
    await loadIncomeCategory(tx, input.categoryId)
    await loadBankAccount(tx, input.bankAccountId)
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)

    const entry = await tx.entry.create({
      data: {
        organizationId,
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        type: "RECEIVABLE",
        description: input.description,
        dueDate: transaction.date,
        amount: input.settledAmount,
        paymentMethod: "BANK_TRANSFER",
      },
    })

    await insertSettlement(tx, organizationId, {
      entryId: entry.id,
      bankTransactionId: input.bankTransactionId,
      origin: "STATEMENT",
      settledAmount: input.settledAmount,
      settledAt: input.settledAt,
    })
  })
}

/**
 * A favorecido's available balance — the amount credited to them via
 * reconciled (STATEMENT-origin only, RN-01a) receivable settlements of sales
 * that named them as a repasse beneficiary, proportional to what was
 * actually settled. Computed on demand from Settlement + Allocation history
 * rather than a persisted ledger. There's no repasse tracking yet (`/payout`
 * is still mock, Fase 7), so nothing is subtracted — this becomes the
 * "already paid" side of the equation once that's built.
 */
export async function getBeneficiaryAvailableBalance(organizationId: string, beneficiaryId: string): Promise<number> {
  return withOrganization(organizationId, async (tx) => {
    const allocations = await tx.allocation.findMany({
      where: { beneficiaryId },
      include: {
        sale: {
          include: {
            entries: { include: { settlements: { where: { origin: "STATEMENT" } } } },
          },
        },
      },
    })

    let total = 0
    for (const allocation of allocations) {
      for (const entry of allocation.sale.entries) {
        for (const settlement of entry.settlements) {
          total += computeBeneficiaryShare(settlement.settledAmount, allocation.sale.totalAmount, allocation.amount)
        }
      }
    }
    return total
  })
}
