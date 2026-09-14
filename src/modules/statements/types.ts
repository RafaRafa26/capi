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
