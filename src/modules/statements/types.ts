export type BankTransactionStatus = "PENDING" | "RECONCILED" | "IGNORED"

export interface BankTransaction {
  id: string
  bankAccountId: string
  bankReference: string
  date: Date
  // Cents, sign preserved from the bank's own statement: credit positive,
  // debit negative.
  amount: number
  description: string
  status: BankTransactionStatus
}

export interface ImportStatementResult {
  importId: string
  periodStart: Date | null
  periodEnd: Date | null
  importedCount: number
  duplicateCount: number
  totalCount: number
}

/** One OFX file uploaded into a bank account — a row of the import history. */
export interface StatementImport {
  id: string
  fileName: string
  importedAt: Date
  // Null on imports from before this was recorded, or when the user was
  // removed from the organization.
  importedByName: string | null
  // From the OFX's DTSTART/DTEND; when the file has none, the earliest and
  // latest transaction it brought in. Null when there's neither.
  periodStart: Date | null
  periodEnd: Date | null
  // Transactions in the file and how many were already imported (RN-16).
  // Null on imports from before these were recorded.
  totalCount: number | null
  duplicateCount: number | null
  // New transactions it brought in — recorded at import time, or counted
  // from the linked transactions on older imports.
  importedCount: number
  // Of the transactions it brought in that still exist, how many are already
  // reconciled — "9 de 12" tells whether that statement still has work left.
  linkedCount: number
  reconciledCount: number
}

/** The latest import of a bank account, for "Última importação" and "Extrato até". */
export interface ImportSummary {
  lastImportedAt: Date | null
  // The last day of the bank's statement already in the app.
  coveredUntil: Date | null
}
