// "pay"/"rec" name the two screens (Contas a pagar / Contas a receber) —
// deliberately not called AccountKind, which the schema already uses for
// BankAccount.kind (CHECKING | SAVINGS_POCKET).
export type LedgerKind = "pay" | "rec"

export type PaymentMethodCode = "BOLETO" | "PIX" | "CREDIT_CARD" | "BANK_TRANSFER"
export type EntryStatus = "FORECAST" | "PARTIAL" | "SETTLED"
export type ContractModality = "INSTALLMENTS" | "RECURRING"
export type ContractBillingFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY"
export type AllocationMode = "PERCENTAGE" | "FIXED_AMOUNT"

export interface AccountAllocation {
  beneficiaryId: string
  beneficiaryName: string
  percentage: number | null
  amount: number
}

// One Settlement row against the entry — the "Recebimentos"/"Pagamentos" tab
// on the detail Sheet lists these individually so each can be estornado
// (undoSettlement) on its own, unlike the aggregate paidAt/settledAmount
// above. `bankAccountName` is only set for a STATEMENT-origin settlement
// (reconciliação de extrato) — a MANUAL one (baixa manual, RN-20) has none.
export interface AccountSettlement {
  id: string
  settledAt: Date
  settledAmount: number
  interest: number
  fine: number
  discount: number
  note: string | null
  bankAccountName: string | null
}

// Present only when the entry comes from a Sale (a parcela) — undefined for
// avulsa entries, which is what the detail Sheet uses to pick its variant.
export interface AccountContract {
  saleId: string
  modality: ContractModality
  totalAmount: number
  installmentsCount: number
  billingFrequency: ContractBillingFrequency
  firstDueDate: Date
}

export interface AccountEntry {
  id: string
  kind: LedgerKind
  contactId: string
  contactName: string
  description: string
  categoryId: string
  categoryName: string
  // PT label for display/filtering — see paymentMethodCode for the raw enum.
  paymentMethod: string
  paymentMethodCode: PaymentMethodCode
  bankAccountId: string
  bankAccountName: string
  dueDate: Date
  // Set only once the entry is fully SETTLED — a PARTIAL entry still shows
  // "—" here, since it isn't paid/recebido yet (see filter.ts#deriveStatus).
  paidAt: Date | null
  amount: number
  settledAmount: number
  // Aggregated across the entry's Settlement rows (see settlements/domain.ts
  // #recomputeEntryAggregate) — 0 until something has been conciliado.
  interest: number
  fine: number
  discount: number
  installment?: string
  installmentNumber?: number
  contract?: AccountContract
  settlements: AccountSettlement[]
  // Repasse (RN-04) — undefined when the sale has no Allocation rows.
  allocationMode?: AllocationMode
  allocations: AccountAllocation[]
  // Favorecidos of the sale's repasse — not the same as contactId/contactName
  // above, which is the client/fornecedor on the entry. Empty for avulsa
  // entries or a sale with no Allocation rows. Derived from `allocations`.
  beneficiaryIds: string[]
  beneficiaryNames: string[]
  // The real DB status — gates which fields the edit dialog lets you touch
  // (RN-17: due date/amount are only editable before conciliação).
  entryStatus: EntryStatus
}
