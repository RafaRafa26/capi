// A despesa avulsa/parcelada/recorrente reuses the same billing vocabulary as
// Venda (ARQUITETURA.md §5.1) — it isn't sale-specific, Sale was just built
// first. See modules/sales/domain.ts for generateInstallments and
// generateRecurringInstallments, reused as-is here.
export type {
  BillingFrequency,
  BillingType,
  Installment,
  PaymentMethod,
} from "@/modules/sales/types"

import type { BillingFrequency, BillingType, Installment, PaymentMethod } from "@/modules/sales/types"

/**
 * A despesa (conta a pagar) has no grouping entity of its own — unlike Sale,
 * which groups its installments, each installment created here is an
 * independent Entry (RECEIVABLE/PAYABLE avulso, per ARQUITETURA.md's
 * Lancamento). This return shape exists only to describe what was created,
 * not something persisted as a single row.
 */
export interface Expense {
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
  recurrenceEndDate: Date | null
  entries: Installment[]
}
