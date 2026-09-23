import { describe, expect, it } from "vitest"

import {
  computeBeneficiaryShare,
  directionForTransactionAmount,
  recomputeEntryAggregate,
  suggestMatches,
} from "./domain"

describe("recomputeEntryAggregate", () => {
  it("returns FORECAST with no settledAmount when there are no settlements", () => {
    expect(recomputeEntryAggregate([], 10_000)).toEqual({
      status: "FORECAST",
      settledAmount: null,
      interest: 0,
      fine: 0,
      discount: 0,
    })
  })

  it("is PARTIAL when the sum of settlements is less than the entry amount", () => {
    const aggregate = recomputeEntryAggregate(
      [{ settledAmount: 4_000, interest: 0, fine: 0, discount: 0 }],
      10_000,
    )
    expect(aggregate.status).toBe("PARTIAL")
    expect(aggregate.settledAmount).toBe(4_000)
  })

  it("is SETTLED once settlements sum to the entry amount or more", () => {
    const aggregate = recomputeEntryAggregate(
      [
        { settledAmount: 4_000, interest: 0, fine: 0, discount: 0 },
        { settledAmount: 6_000, interest: 100, fine: 0, discount: 50 },
      ],
      10_000,
    )
    expect(aggregate.status).toBe("SETTLED")
    expect(aggregate.settledAmount).toBe(10_000)
    expect(aggregate.interest).toBe(100)
    expect(aggregate.discount).toBe(50)
  })

  it("recomputing after removing a settlement reflects only what remains", () => {
    const withBoth = recomputeEntryAggregate(
      [
        { settledAmount: 4_000, interest: 0, fine: 0, discount: 0 },
        { settledAmount: 6_000, interest: 0, fine: 0, discount: 0 },
      ],
      10_000,
    )
    expect(withBoth.status).toBe("SETTLED")

    const afterUndoingOne = recomputeEntryAggregate(
      [{ settledAmount: 4_000, interest: 0, fine: 0, discount: 0 }],
      10_000,
    )
    expect(afterUndoingOne.status).toBe("PARTIAL")
    expect(afterUndoingOne.settledAmount).toBe(4_000)
  })
})

describe("directionForTransactionAmount", () => {
  it("is RECEIVABLE for a credit (entrada)", () => {
    expect(directionForTransactionAmount(1_000)).toBe("RECEIVABLE")
  })

  it("is PAYABLE for a debit (saída)", () => {
    expect(directionForTransactionAmount(-1_000)).toBe("PAYABLE")
  })
})

describe("computeBeneficiaryShare", () => {
  it("is proportional to what was actually settled", () => {
    // Sale of 1000, beneficiary allocated 300 (30%) — a 500 partial
    // settlement (50% of the sale) credits 50% of the allocation.
    expect(computeBeneficiaryShare(500, 1_000, 300)).toBe(150)
  })

  it("credits the full allocation when the settlement covers the whole sale", () => {
    expect(computeBeneficiaryShare(1_000, 1_000, 300)).toBe(300)
  })

  it("is zero for a sale with no total (defensive, shouldn't happen in practice)", () => {
    expect(computeBeneficiaryShare(500, 0, 300)).toBe(0)
  })
})

describe("suggestMatches", () => {
  const entries = [
    { id: "close", amount: 10_000, settledAmount: null, dueDate: new Date(2026, 7, 10) },
    { id: "far", amount: 10_000, settledAmount: null, dueDate: new Date(2026, 7, 1) },
    { id: "wrong-amount", amount: 5_000, settledAmount: null, dueDate: new Date(2026, 7, 10) },
    { id: "already-partial", amount: 12_000, settledAmount: 2_000, dueDate: new Date(2026, 7, 11) },
  ]

  it("matches entries whose remaining amount equals the transaction's absolute value", () => {
    // "already-partial" (12_000 amount, 2_000 already settled) also has a
    // 10_000 remainder, so it matches too — ordered by date proximity.
    const matches = suggestMatches(10_000, new Date(2026, 7, 10), entries)
    expect(matches.map((m) => m.id)).toEqual(["close", "already-partial", "far"])
  })

  it("matches a partially-settled entry by its remaining amount", () => {
    const matches = suggestMatches(10_000, new Date(2026, 7, 11), entries)
    expect(matches.map((m) => m.id)).toContain("already-partial")
  })

  it("works for a debit (negative) transaction amount", () => {
    const matches = suggestMatches(-10_000, new Date(2026, 7, 10), entries)
    expect(matches.map((m) => m.id)).toEqual(["close", "already-partial", "far"])
  })

  it("ranks matches by proximity of due date to the transaction date", () => {
    const matches = suggestMatches(10_000, new Date(2026, 7, 9), entries)
    expect(matches[0].id).toBe("close")
  })

  it("returns nothing when no entry's remaining amount matches", () => {
    expect(suggestMatches(999, new Date(2026, 7, 10), entries)).toEqual([])
  })
})
