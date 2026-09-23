export type SettlementOrigin = "STATEMENT" | "MANUAL"
export type EntryStatus = "FORECAST" | "PARTIAL" | "SETTLED" | "CANCELED"
export type EntryType = "RECEIVABLE" | "PAYABLE" | "TRANSFER"

export interface EntryAggregate {
  status: EntryStatus
  settledAmount: number | null
  interest: number
  fine: number
  discount: number
}

export interface CandidateEntry {
  id: string
  contactName: string
  description: string
  dueDate: Date
  amount: number
  settledAmount: number | null
  type: EntryType
}

export interface MatchedSettlement {
  settlementId: string
  entryId: string
  entryType: EntryType
  contactName: string
  description: string
  categoryName: string
  dueDate: Date
  settledAmount: number
}

export interface TransactionMatchInfo {
  bankTransactionId: string
  matches: MatchedSettlement[]
  suggestions: CandidateEntry[]
}
