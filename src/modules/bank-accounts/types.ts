export type AccountKind = "CHECKING" | "SAVINGS_POCKET"
export type PersonType = "INDIVIDUAL" | "COMPANY"

export interface BankAccount {
  id: string
  name: string
  bank: string
  branchNumber: string
  accountNumber: string
  kind: AccountKind
  holderType: PersonType
  controlStartDate: Date
  initialBalance: number
  active: boolean
}

export interface BankAccountOverview extends BankAccount {
  // initialBalance + soma das BankTransaction RECONCILED da conta.
  currentBalance: number
  pendingCount: number
}

export interface BankAccountStatementLine {
  bankTransactionId: string
  date: Date
  description: string
  amount: number
  runningBalance: number
  settledEntries: { entryId: string; contactName: string; description: string }[]
}

export interface BankAccountStatement {
  bankAccount: BankAccount
  currentBalance: number
  lines: BankAccountStatementLine[]
}
