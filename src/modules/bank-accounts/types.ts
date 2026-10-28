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
  // initialBalance + soma das BankTransaction RECONCILED da conta + pernas de
  // transferência ainda não conciliadas.
  currentBalance: number
  pendingCount: number
}

export interface BankAccountStatementEntry {
  entryId: string
  entryType: "RECEIVABLE" | "PAYABLE" | "TRANSFER"
  // "Transferência" quando é perna de transferência (sem contato).
  contactName: string
  description: string
  // Quanto deste lançamento esta linha quitou, em centavos — uma transação
  // conciliada com vários lançamentos se divide entre eles.
  amount: number
}

export interface BankAccountStatementLine {
  // bankTransactionId, ou o id da perna de transferência ainda não conciliada.
  id: string
  // Nulo na perna de transferência que ainda espera o extrato desta conta.
  bankTransactionId: string | null
  date: Date
  description: string
  amount: number
  runningBalance: number
  // Os lançamentos da linha — o que o extrato mostra no lugar da descrição do
  // banco, e o que abre a Sheet ao clicar. Na transação conciliada, os que ela
  // quitou (vários na quitação múltipla); na perna pendente, ela mesma.
  entries: BankAccountStatementEntry[]
}

export interface BankAccountStatement {
  bankAccount: BankAccount
  currentBalance: number
  lines: BankAccountStatementLine[]
}
