import {
  generateInstallments,
  generateRecurringInstallments,
} from "@/modules/sales/domain"
import type {
  AllocationMode,
  BillingFrequency,
  Installment,
  PaymentMethod,
} from "@/modules/sales/types"

/**
 * State of the "Registrar" sheet — one shape for venda and despesa, since
 * they share the whole billing vocabulary (ARQUITETURA.md §5.1). Only the
 * repasse fields are sale-specific; they're ignored for a despesa.
 */
export type EntryKind = "sale" | "expense"

/** The three real ways of charging, shown as one control. */
export type Repetition = "single" | "installments" | "recurring"

export interface AllocationRow {
  id: string
  beneficiaryId: string
  /** 0–100 for PERCENTAGE, cents for FIXED_AMOUNT. */
  value: number
}

export interface EntryDraft {
  kind: EntryKind
  contactId: string
  categoryId: string
  description: string
  /** Cents. A total for single/installments, the amount per period for recurring. */
  amount: number
  repetition: Repetition
  installmentsCount: number
  frequency: BillingFrequency
  firstDueDate: Date
  /** RECURRING only: null means no end date (indeterminado). */
  recurrenceEndDate: Date | null
  paymentMethod: PaymentMethod | ""
  bankAccountId: string
  allocationEnabled: boolean
  allocationMode: AllocationMode
  allocations: AllocationRow[]
}

export const DEFAULT_INSTALLMENTS_COUNT = 2

export function emptyDraft(kind: EntryKind, today: Date): EntryDraft {
  return {
    kind,
    contactId: "",
    categoryId: "",
    description: "",
    amount: 0,
    repetition: "single",
    installmentsCount: DEFAULT_INSTALLMENTS_COUNT,
    frequency: "MONTHLY",
    firstDueDate: today,
    recurrenceEndDate: null,
    paymentMethod: "",
    bankAccountId: "",
    allocationEnabled: false,
    allocationMode: "PERCENTAGE",
    allocations: [],
  }
}

/**
 * Switching between venda and despesa inside the sheet keeps what means the
 * same thing in both (value, dates, description, how it's paid) and clears
 * what doesn't: contacts and categories come from different lists, and only
 * a venda has repasse.
 */
export function switchKind(draft: EntryDraft, kind: EntryKind): EntryDraft {
  if (draft.kind === kind) return draft
  return {
    ...draft,
    kind,
    contactId: "",
    categoryId: "",
    allocationEnabled: false,
    allocations: [],
  }
}

/**
 * "Salvar e registrar outra": keeps what tends to repeat across a batch of
 * entries (type, category, account, payment method, how it repeats) and
 * clears what identifies this one.
 */
export function draftForNext(draft: EntryDraft, today: Date): EntryDraft {
  return {
    ...emptyDraft(draft.kind, today),
    categoryId: draft.categoryId,
    paymentMethod: draft.paymentMethod,
    bankAccountId: draft.bankAccountId,
    repetition: draft.repetition,
    installmentsCount: draft.installmentsCount,
    frequency: draft.frequency,
  }
}

/** Whether closing the sheet would throw away something the user typed. */
export function isDraftDirty(draft: EntryDraft): boolean {
  return (
    draft.amount > 0 ||
    draft.description.trim() !== "" ||
    draft.contactId !== "" ||
    draft.allocations.length > 0
  )
}

/**
 * The installments the current fields produce. Invalid intermediate states
 * (e.g. an end date before the first due date while the user is still picking)
 * give an empty schedule; the real validation happens on submit.
 */
export function generateSchedule(draft: EntryDraft): Installment[] {
  try {
    if (draft.repetition === "recurring") {
      return generateRecurringInstallments({
        amountPerOccurrence: draft.amount,
        firstDueDate: draft.firstDueDate,
        frequency: draft.frequency,
        endDate: draft.recurrenceEndDate,
      })
    }
    return generateInstallments({
      totalAmount: draft.amount,
      count: draft.repetition === "single" ? 1 : draft.installmentsCount,
      firstDueDate: draft.firstDueDate,
      frequency: draft.frequency,
    })
  } catch {
    return []
  }
}

/**
 * Changes whenever a field the schedule is generated from changes. RN-17
 * treats those fields as the source of truth: per-installment edits are kept
 * only until one of them changes, then the schedule is regenerated.
 */
export function scheduleKey(draft: EntryDraft): string {
  const end = draft.recurrenceEndDate ? draft.recurrenceEndDate.getTime() : "open"
  if (draft.repetition === "recurring") {
    return `R-${draft.amount}-${draft.firstDueDate.getTime()}-${draft.frequency}-${end}`
  }
  const count = draft.repetition === "single" ? 1 : draft.installmentsCount
  return `I-${draft.amount}-${count}-${draft.firstDueDate.getTime()}-${draft.frequency}`
}

/**
 * In a parcelada entry the total is the sum of its installments, so an edit
 * to one installment's amount moves the total with it. A recurring entry's
 * amount is per period, and an avulsa has a single installment generated
 * from the amount itself, so both stay as they are.
 */
export function withInstallmentsTotal(draft: EntryDraft, installments: Installment[]): EntryDraft {
  if (draft.repetition !== "installments" || installments.length === 0) return draft
  const total = installments.reduce((sum, installment) => sum + installment.amount, 0)
  return total === draft.amount ? draft : { ...draft, amount: total }
}

export function allocationAmount(mode: AllocationMode, base: number, value: number): number {
  return mode === "PERCENTAGE" ? Math.round(base * (value / 100)) : value
}

/** Share of the base already split among beneficiaries, 0–100 (can pass 100 while typing). */
export function allocatedPercent(draft: EntryDraft): number {
  if (draft.allocationMode === "PERCENTAGE") {
    return draft.allocations.reduce((sum, row) => sum + row.value, 0)
  }
  if (draft.amount <= 0) return 0
  const total = draft.allocations.reduce((sum, row) => sum + row.value, 0)
  return Math.round((total / draft.amount) * 10000) / 100
}

/**
 * The payload the sale/expense server actions validate (sales/schema.ts,
 * expenses/schema.ts). `installments` is what gets persisted, edits included.
 */
export function buildPayload(draft: EntryDraft, installments: Installment[]) {
  const recurring = draft.repetition === "recurring"
  const base = {
    contactId: draft.contactId,
    categoryId: draft.categoryId,
    bankAccountId: draft.bankAccountId,
    description: draft.description,
    totalAmount: draft.amount,
    paymentMethod: draft.paymentMethod,
    billingType: recurring ? ("RECURRING" as const) : ("INSTALLMENTS" as const),
    installmentsCount: installments.length,
    billingFrequency: draft.frequency,
    firstDueDate: draft.firstDueDate,
    recurrenceEndDate: recurring ? draft.recurrenceEndDate : null,
    installments,
  }

  if (draft.kind === "expense") return base

  const withAllocations = draft.allocationEnabled && draft.allocations.length > 0
  return {
    ...base,
    allocationMode: withAllocations ? draft.allocationMode : undefined,
    allocations: withAllocations
      ? draft.allocations.map(({ beneficiaryId, value }) => ({ beneficiaryId, value }))
      : [],
  }
}
