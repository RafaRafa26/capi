// Pure settlement logic — no I/O, see AGENTS.md/ARQUITETURA.md §8.2.

import type { EntryAggregate, EntryStatus } from "./types"

export interface SettlementAmounts {
  settledAmount: number
  interest: number
  fine: number
  discount: number
}

/**
 * Recomputes an Entry's aggregate (status + settledAmount + interest/fine/
 * discount) from the full set of its Settlement rows, instead of patching it
 * incrementally on every create/undo — so it can never drift from its own
 * history. No Settlement rows means the entry is untouched (FORECAST).
 */
export function recomputeEntryAggregate(settlements: SettlementAmounts[], entryAmount: number): EntryAggregate {
  if (settlements.length === 0) {
    return { status: "FORECAST", settledAmount: null, interest: 0, fine: 0, discount: 0 }
  }

  const totals = settlements.reduce(
    (acc, s) => ({
      settledAmount: acc.settledAmount + s.settledAmount,
      interest: acc.interest + s.interest,
      fine: acc.fine + s.fine,
      discount: acc.discount + s.discount,
    }),
    { settledAmount: 0, interest: 0, fine: 0, discount: 0 },
  )

  const status: EntryStatus = totals.settledAmount >= entryAmount ? "SETTLED" : "PARTIAL"
  return { status, ...totals }
}

/**
 * Which Entry direction a bank transaction could settle — the bank's own
 * sign says entrada/saída (see statements/service.ts), which maps 1:1 to
 * RECEIVABLE/PAYABLE.
 */
export function directionForTransactionAmount(amount: number): "RECEIVABLE" | "PAYABLE" {
  return amount >= 0 ? "RECEIVABLE" : "PAYABLE"
}

/**
 * A favorecido's share of one settlement event, proportional to how much of
 * the sale's total that event actually settled. This is what makes a
 * partial payment (RN-06) automatically credit a partial repasse too, with
 * no separate rateio algorithm (RN-05) needed — the user already chose how
 * much of the bank transaction applies to each entry (the reconciliation UI
 * lets them edit that per lançamento), and the beneficiary's share follows
 * that number.
 */
export function computeBeneficiaryShare(
  settledAmount: number,
  saleTotalAmount: number,
  allocationAmount: number,
): number {
  if (saleTotalAmount === 0) return 0
  return Math.round((allocationAmount * settledAmount) / saleTotalAmount)
}

export interface SuggestableEntry {
  id: string
  amount: number
  settledAmount: number | null
  dueDate: Date
}

/**
 * Simple exact-remaining-amount heuristic, ranked by date proximity — no
 * fuzzy/AI matching (ARQUITETURA.md §3.2 explicitly defers "conciliação
 * automática por sugestão inteligente" to a future phase). Callers are
 * expected to have already narrowed `openEntries` to the right
 * direction/status via the DB query — see
 * settlements/service.ts#suggestMatchesForTransaction.
 */
export function suggestMatches(
  transactionAmount: number,
  transactionDate: Date,
  openEntries: SuggestableEntry[],
): SuggestableEntry[] {
  const target = Math.abs(transactionAmount)

  return openEntries
    .filter((entry) => entry.amount - (entry.settledAmount ?? 0) === target)
    .sort(
      (a, b) =>
        Math.abs(a.dueDate.getTime() - transactionDate.getTime()) -
        Math.abs(b.dueDate.getTime() - transactionDate.getTime()),
    )
}
