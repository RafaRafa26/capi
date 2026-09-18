import { describe, expect, it } from "vitest"

import { bucketEntries, type BucketableEntry } from "./domain"

function entry(overrides: Partial<BucketableEntry> = {}): BucketableEntry {
  return {
    contactName: "Cliente Teste",
    description: "Lançamento de teste",
    dueDate: new Date(2026, 8, 15),
    amount: 1000,
    settledAmount: null,
    status: "FORECAST",
    ...overrides,
  }
}

const today = new Date(2026, 8, 15)

describe("bucketEntries", () => {
  it("classifies a due date before today as vencido", () => {
    const result = bucketEntries([entry({ dueDate: new Date(2026, 8, 10) })], today)
    expect(result.buckets.vencido.count).toBe(1)
    expect(result.buckets.venceHoje.count).toBe(0)
    expect(result.buckets.aVencer.count).toBe(0)
  })

  it("classifies a due date equal to today as venceHoje, ignoring time of day", () => {
    const result = bucketEntries([entry({ dueDate: new Date(2026, 8, 15, 23, 59) })], today)
    expect(result.buckets.venceHoje.count).toBe(1)
  })

  it("classifies a due date after today as aVencer", () => {
    const result = bucketEntries([entry({ dueDate: new Date(2026, 8, 20) })], today)
    expect(result.buckets.aVencer.count).toBe(1)
  })

  it("excludes SETTLED and CANCELED entries — only open ones belong here", () => {
    const result = bucketEntries(
      [
        entry({ status: "SETTLED" }),
        entry({ status: "CANCELED" }),
        entry({ status: "PARTIAL" }),
      ],
      today,
    )
    expect(result.buckets.venceHoje.count).toBe(1)
  })

  it("uses the remaining open amount, not the full due amount, when partially settled", () => {
    const result = bucketEntries([entry({ status: "PARTIAL", amount: 1000, settledAmount: 400 })], today)
    expect(result.buckets.venceHoje.itens[0].valor).toBe(600)
  })

  it("sums totals per bucket and overall", () => {
    const result = bucketEntries(
      [
        entry({ dueDate: new Date(2026, 8, 10), amount: 100 }),
        entry({ dueDate: new Date(2026, 8, 10), amount: 200 }),
        entry({ dueDate: new Date(2026, 8, 20), amount: 500 }),
      ],
      today,
    )
    expect(result.buckets.vencido.total).toBe(300)
    expect(result.buckets.aVencer.total).toBe(500)
    expect(result.total).toBe(800)
  })

  it("sorts items within a bucket by due date", () => {
    const result = bucketEntries(
      [
        entry({ dueDate: new Date(2026, 8, 25), description: "later" }),
        entry({ dueDate: new Date(2026, 8, 18), description: "sooner" }),
      ],
      today,
    )
    expect(result.buckets.aVencer.itens.map((i) => i.descricao)).toEqual(["sooner", "later"])
  })

  it("returns empty buckets for no entries", () => {
    const result = bucketEntries([], today)
    expect(result.total).toBe(0)
    expect(result.buckets.vencido.itens).toEqual([])
  })
})
