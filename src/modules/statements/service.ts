import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import { parseOfx } from "./ofx"
import type { ImportStatementInput } from "./schema"
import type { BankTransaction, ImportStatementResult, ImportSummary, StatementImport } from "./types"

async function loadBankAccount(tx: Tx, bankAccountId: string) {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new NotFound("Conta bancária")
  return bankAccount
}

/**
 * Imports an OFX file into `bankAccountId`. RN-16: a bank transaction is
 * unique per (bank account, FITID) — enforced by the database's own unique
 * index, not only by this function, so `createMany`'s `skipDuplicates` is
 * what actually makes reimporting the same file a no-op rather than a
 * pre-check that a race could slip past.
 *
 * Every upload is recorded in the import history — a reimport that brings
 * nothing new included — with who sent it and what it found.
 */
export async function importStatement(
  organizationId: string,
  importedById: string,
  input: ImportStatementInput,
): Promise<ImportStatementResult> {
  return withOrganization(organizationId, async (tx) => {
    await loadBankAccount(tx, input.bankAccountId)

    const statement = parseOfx(input.content)

    const bankImport = await tx.import.create({
      data: {
        organizationId,
        bankAccountId: input.bankAccountId,
        createdById: importedById,
        fileName: input.fileName,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
        totalCount: statement.transactions.length,
      },
    })

    const { count: importedCount } = await tx.bankTransaction.createMany({
      data: statement.transactions.map((transaction) => ({
        organizationId,
        bankAccountId: input.bankAccountId,
        importId: bankImport.id,
        bankReference: transaction.fitId,
        date: transaction.postedAt,
        amount: transaction.amount,
        description: transaction.description,
      })),
      skipDuplicates: true,
    })
    const duplicateCount = statement.transactions.length - importedCount

    // Only known once the rows are in — skipDuplicates is what tells them apart.
    await tx.import.update({ where: { id: bankImport.id }, data: { importedCount, duplicateCount } })

    return {
      importId: bankImport.id,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      importedCount,
      duplicateCount,
      totalCount: statement.transactions.length,
    }
  })
}

/**
 * Every OFX file imported into `bankAccountId`, newest first — the whole
 * history, not just the recent ones.
 */
export async function listImports(organizationId: string, bankAccountId: string): Promise<StatementImport[]> {
  return withOrganization(organizationId, async (tx) => {
    await loadBankAccount(tx, bankAccountId)

    const imports = await tx.import.findMany({
      where: { bankAccountId },
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
    if (imports.length === 0) return []

    // One pass over the account's transactions, split by import and status:
    // the reconciled share of each statement, plus the date range of what it
    // brought in, for files that have no DTSTART/DTEND.
    const groups = await tx.bankTransaction.groupBy({
      by: ["importId", "status"],
      where: { bankAccountId },
      _count: { _all: true },
      _min: { date: true },
      _max: { date: true },
    })

    const linked = new Map<string, { count: number; reconciled: number; first: Date | null; last: Date | null }>()
    for (const group of groups) {
      const current = linked.get(group.importId) ?? { count: 0, reconciled: 0, first: null, last: null }
      current.count += group._count._all
      if (group.status === "RECONCILED") current.reconciled += group._count._all
      if (group._min.date && (!current.first || group._min.date < current.first)) current.first = group._min.date
      if (group._max.date && (!current.last || group._max.date > current.last)) current.last = group._max.date
      linked.set(group.importId, current)
    }

    return imports.map((bankImport) => {
      const transactions = linked.get(bankImport.id)
      const periodStart = bankImport.periodStart ?? transactions?.first ?? null
      const periodEnd = bankImport.periodEnd ?? transactions?.last ?? null
      return {
        id: bankImport.id,
        fileName: bankImport.fileName,
        importedAt: bankImport.createdAt,
        importedByName: bankImport.createdBy?.name ?? null,
        periodStart: periodStart && fromDbDate(periodStart),
        periodEnd: periodEnd && fromDbDate(periodEnd),
        totalCount: bankImport.totalCount,
        duplicateCount: bankImport.duplicateCount,
        importedCount: bankImport.importedCount ?? transactions?.count ?? 0,
        linkedCount: transactions?.count ?? 0,
        reconciledCount: transactions?.reconciled ?? 0,
      }
    })
  })
}

/**
 * When each account last got a statement, and up to which day the bank's
 * statement is already in the app. "Extrato até" takes the later of the
 * files' DTEND and the latest transaction date, so a file without DTEND —
 * or one whose DTEND stops short of its own transactions — still counts.
 */
export async function getImportSummaries(
  tx: Tx,
  bankAccountIds: string[],
): Promise<Map<string, ImportSummary>> {
  const summaries = new Map<string, ImportSummary>()
  if (bankAccountIds.length === 0) return summaries

  const [imports, transactions] = await Promise.all([
    tx.import.groupBy({
      by: ["bankAccountId"],
      where: { bankAccountId: { in: bankAccountIds } },
      _max: { createdAt: true, periodEnd: true },
    }),
    tx.bankTransaction.groupBy({
      by: ["bankAccountId"],
      where: { bankAccountId: { in: bankAccountIds } },
      _max: { date: true },
    }),
  ])

  const lastTransactionDate = new Map(transactions.map((row) => [row.bankAccountId, row._max.date]))
  for (const row of imports) {
    const candidates = [row._max.periodEnd, lastTransactionDate.get(row.bankAccountId)].filter(
      (date): date is Date => date != null,
    )
    const coveredUntil = candidates.length > 0 ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null
    summaries.set(row.bankAccountId, {
      lastImportedAt: row._max.createdAt,
      coveredUntil: coveredUntil && fromDbDate(coveredUntil),
    })
  }
  return summaries
}

export async function getImportSummary(organizationId: string, bankAccountId: string): Promise<ImportSummary> {
  return withOrganization(organizationId, async (tx) => {
    const summaries = await getImportSummaries(tx, [bankAccountId])
    return summaries.get(bankAccountId) ?? { lastImportedAt: null, coveredUntil: null }
  })
}

/**
 * What's still left to reconcile in `bankAccountId`. Reconciled transactions
 * leave this list and show up in the account's statement instead, where
 * they can be unreconciled (undoBankTransactionReconciliation).
 */
export async function listBankTransactions(
  organizationId: string,
  bankAccountId: string,
): Promise<BankTransaction[]> {
  const transactions = await withOrganization(organizationId, (tx) =>
    tx.bankTransaction.findMany({
      where: { bankAccountId, status: { not: "RECONCILED" } },
      orderBy: { date: "desc" },
    }),
  )
  return transactions.map((transaction) => ({ ...transaction, date: fromDbDate(transaction.date) }))
}

export async function deleteBankTransaction(organizationId: string, id: string): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const transaction = await tx.bankTransaction.findUnique({ where: { id } })
    if (!transaction) throw new NotFound("Transação bancária")

    const settlementsCount = await tx.settlement.count({ where: { bankTransactionId: id } })
    if (settlementsCount > 0) {
      throw new BusinessError("Esta transação já está conciliada — desvincule antes de removê-la.")
    }

    await tx.bankTransaction.delete({ where: { id } })
  })
}
