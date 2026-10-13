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

// The "Emitir recibo" printable view's data — one Settlement plus just
// enough of its Entry to describe what was paid/recebido.
export interface SettlementReceipt {
  id: string
  settledAt: Date
  settledAmount: number
  interest: number
  fine: number
  discount: number
  note: string | null
  entryType: EntryType
  entryDescription: string
  contactName: string
  categoryName: string
  installment: string | null
}

// O painel "Transferência" (RN-15): as duas pernas, cada uma na sua conta.
export interface TransferLeg {
  entryId: string
  bankAccountName: string
  direction: "OUT" | "IN"
  date: Date
  // Com sinal: negativo na saída (origem), positivo na entrada (destino).
  amount: number
  reconciled: boolean
  // As transações do extrato com que esta perna foi conciliada.
  bankTransactions: { id: string; description: string; date: Date; amount: number }[]
}

export interface TransferDetail {
  description: string
  legs: TransferLeg[]
}
