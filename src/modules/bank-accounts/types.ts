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
