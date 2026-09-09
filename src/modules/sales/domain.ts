import { BusinessError } from "@/shared/errors"
import type {
  Allocation,
  AllocationBeneficiaryInput,
  AllocationMode,
  BillingFrequency,
  Installment,
} from "./types"

function addPeriod(date: Date, frequency: BillingFrequency, times: number): Date {
  const result = new Date(date)
  switch (frequency) {
    case "WEEKLY":
      result.setDate(result.getDate() + times * 7)
      break
    case "BIWEEKLY":
      result.setDate(result.getDate() + times * 15)
      break
    case "MONTHLY":
      result.setMonth(result.getMonth() + times)
      break
    case "YEARLY":
      result.setFullYear(result.getFullYear() + times)
      break
  }
  return result
}

/**
 * Splits `totalAmount` into `count` installments, due every `frequency` from
 * `firstDueDate`. The rounding residual from dividing cents unevenly always
 * lands on the last installment, so the set sums back to exactly the total.
 */
export function generateInstallments(input: {
  totalAmount: number
  count: number
  firstDueDate: Date
  frequency: BillingFrequency
}): Installment[] {
  const { totalAmount, count, firstDueDate, frequency } = input
  if (count < 1) throw new BusinessError("O número de parcelas deve ser pelo menos 1.")

  const base = Math.floor(totalAmount / count)
  const residual = totalAmount - base * count

  return Array.from({ length: count }, (_, index) => ({
    installmentNumber: index + 1,
    dueDate: addPeriod(firstDueDate, frequency, index),
    amount: index === count - 1 ? base + residual : base,
  }))
}

/**
 * Rolling window of entries kept alive for an indeterminate (no end date)
 * recurring sale — see generateRecurringInstallments. Keeping this constant
 * at 3 as new ones are reconciled is Liquidação's job (Fase 6), not built
 * yet; see the "Pendência para a Fase 6" note in ARQUITETURA.md §5.1.
 */
export const RECURRING_ROLLING_WINDOW = 3

// A sane upper bound so a careless end date (decades out, weekly) can't
// generate an unbounded number of rows.
const MAX_RECURRING_OCCURRENCES = 520

/** How many occurrences of `frequency` starting at `firstDueDate` fall on or
 * before `endDate`, counting `firstDueDate` itself as the first one. */
function countOccurrencesUntil(firstDueDate: Date, endDate: Date, frequency: BillingFrequency): number {
  if (endDate < firstDueDate) {
    throw new BusinessError("A data de término deve ser depois do primeiro vencimento.")
  }

  let count = 0
  while (addPeriod(firstDueDate, frequency, count) <= endDate) {
    count += 1
    if (count > MAX_RECURRING_OCCURRENCES) {
      throw new BusinessError(
        "Período longo demais para essa periodicidade — informe uma data de término mais próxima.",
      )
    }
  }
  return count
}

/**
 * Generates entries for a recurring sale — every entry carries the same
 * `amountPerOccurrence` (unlike generateInstallments, which divides a
 * total). With `endDate`, generates every occurrence up to it. Without one
 * (indeterminado), generates a fixed rolling window instead of trying to
 * generate indefinitely — see RECURRING_ROLLING_WINDOW.
 */
export function generateRecurringInstallments(input: {
  amountPerOccurrence: number
  firstDueDate: Date
  frequency: BillingFrequency
  endDate: Date | null
}): Installment[] {
  const { amountPerOccurrence, firstDueDate, frequency, endDate } = input
  const count = endDate
    ? countOccurrencesUntil(firstDueDate, endDate, frequency)
    : RECURRING_ROLLING_WINDOW

  return Array.from({ length: count }, (_, index) => ({
    installmentNumber: index + 1,
    dueDate: addPeriod(firstDueDate, frequency, index),
    amount: amountPerOccurrence,
  }))
}

/**
 * Computes repasse (Allocation) rows for a sale — RN-04: the destination is
 * optional, but when there is at least one beneficiary, the set must add up
 * to exactly the sale's total (0 OU Σ=100%, never anything in between).
 *
 * For PERCENTAGE, per-beneficiary rounding residual lands on the last row so
 * the sum always matches the total exactly. For FIXED_AMOUNT there's no
 * rounding to correct — the values must already add up, or this rejects it
 * outright rather than silently changing what the user typed.
 */
export function calculateAllocations(
  totalAmount: number,
  mode: AllocationMode,
  beneficiaries: AllocationBeneficiaryInput[],
): Allocation[] {
  if (beneficiaries.length === 0) return []

  if (mode === "PERCENTAGE") {
    const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.value, 0)
    if (totalPercentage !== 100) {
      throw new BusinessError("A soma dos percentuais de repasse deve ser exatamente 100%.")
    }

    const amounts = beneficiaries.map((b) => Math.round(totalAmount * (b.value / 100)))
    const residual = totalAmount - amounts.reduce((sum, amount) => sum + amount, 0)

    return beneficiaries.map((b, index) => ({
      beneficiaryId: b.beneficiaryId,
      mode,
      percentage: b.value,
      amount: index === amounts.length - 1 ? amounts[index] + residual : amounts[index],
      order: index,
    }))
  }

  const totalFixed = beneficiaries.reduce((sum, b) => sum + b.value, 0)
  if (totalFixed !== totalAmount) {
    throw new BusinessError("A soma dos valores fixos de repasse deve corresponder ao total da venda.")
  }

  return beneficiaries.map((b, index) => ({
    beneficiaryId: b.beneficiaryId,
    mode,
    percentage: null,
    amount: b.value,
    order: index,
  }))
}
