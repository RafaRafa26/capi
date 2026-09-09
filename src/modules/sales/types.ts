export type PaymentMethod = "BOLETO" | "PIX" | "CREDIT_CARD" | "BANK_TRANSFER"
export type BillingFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY"
export type AllocationMode = "PERCENTAGE" | "FIXED_AMOUNT"
// INSTALLMENTS: `totalAmount` is a total, split into a known number of
// installments. RECURRING: `totalAmount` is the amount charged every period
// — a due date only, no fixed total (see domain.ts#generateRecurringInstallments).
export type BillingType = "INSTALLMENTS" | "RECURRING"

export interface AllocationBeneficiaryInput {
  beneficiaryId: string
  value: number
}

export interface Installment {
  installmentNumber: number
  dueDate: Date
  amount: number
}

export interface Allocation {
  beneficiaryId: string
  mode: AllocationMode
  percentage: number | null
  amount: number
  order: number
}

export interface Sale {
  id: string
  contactId: string
  categoryId: string
  bankAccountId: string
  description: string
  totalAmount: number
  paymentMethod: PaymentMethod
  billingType: BillingType
  installmentsCount: number
  billingFrequency: BillingFrequency
  firstDueDate: Date
  // RECURRING only: null means indeterminado (open-ended).
  recurrenceEndDate: Date | null
  entries: Installment[]
  allocations: Allocation[]
}
