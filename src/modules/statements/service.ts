import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import { parseOfx } from "./ofx"
import type { ImportStatementInput } from "./schema"
import type { BankTransaction, ImportStatementResult } from "./types"

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
 */
export async function importStatement(
  organizationId: string,
  input: ImportStatementInput,
): Promise<ImportStatementResult> {
  return withOrganization(organizationId, async (tx) => {
    await loadBankAccount(tx, input.bankAccountId)

    const statement = parseOfx(input.content)

    const bankImport = await tx.import.create({
      data: {
        organizationId,
        bankAccountId: input.bankAccountId,
        fileName: input.fileName,
        periodStart: statement.periodStart,
        periodEnd: statement.periodEnd,
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

    return {
      importId: bankImport.id,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      importedCount,
      duplicateCount: statement.transactions.length - importedCount,
      totalCount: statement.transactions.length,
    }
  })
}

export async function listBankTransactions(
  organizationId: string,
  bankAccountId: string,
): Promise<BankTransaction[]> {
  const transactions = await withOrganization(organizationId, (tx) =>
    tx.bankTransaction.findMany({
      where: { bankAccountId },
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
