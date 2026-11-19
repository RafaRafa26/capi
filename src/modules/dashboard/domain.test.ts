import { describe, expect, it } from "vitest"

import { bucketEntries, buildBalanceSeries, flowSeriesBounds, type BucketableEntry } from "./domain"

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

describe("buildBalanceSeries", () => {
  const base = {
    from: new Date(2026, 8, 27),
    to: new Date(2026, 8, 30),
    today: new Date(2026, 8, 29, 10),
    currentBalance: 10000,
  }

  it("rewinds each day by what moved after it", () => {
    const series = buildBalanceSeries({
      ...base,
      realized: [
        { day: "2026-09-28", amount: 3000 },
        { day: "2026-09-29", amount: -1000 },
      ],
    })
    expect(series.map((p) => [p.day, p.balance])).toEqual([
      ["2026-09-27", 8000],
      ["2026-09-28", 11000],
      ["2026-09-29", 10000],
      ["2026-09-30", 10000],
    ])
  })

  it("projects the days after today from what is still open, dotted", () => {
    const series = buildBalanceSeries({
      ...base,
      to: new Date(2026, 9, 1),
      realized: [],
      forecast: [
        { day: "2026-09-20", amount: 99999 }, // overdue: no date to place it
        { day: "2026-09-29", amount: 500 },
        { day: "2026-09-30", amount: -2000 },
        { day: "2026-10-01", amount: 700 },
      ],
    })
    expect(series.map((p) => [p.day, p.balance, p.projected])).toEqual([
      ["2026-09-27", 10000, false],
      ["2026-09-28", 10000, false],
      ["2026-09-29", 10000, false],
      ["2026-09-30", 8500, true],
      ["2026-10-01", 9200, true],
    ])
  })
})

describe("flowSeriesBounds", () => {
  const today = new Date(2026, 8, 29, 12)

  it("keeps a bounded period as calendar days", () => {
    expect(flowSeriesBounds({ from: new Date(2026, 8, 1), to: new Date(2026, 8, 30, 23, 59) }, today, [], [])).toEqual({
      from: new Date(2026, 8, 1),
      to: new Date(2026, 8, 30),
    })
  })

  it("spans first movement to last open due date for 'todo o período'", () => {
    expect(
      flowSeriesBounds(
        { from: null, to: null },
        today,
        [{ day: "2025-03-10", amount: 1 }],
        [{ day: "2027-01-05", amount: 1 }],
      ),
    ).toEqual({ from: new Date(2025, 2, 10), to: new Date(2027, 0, 5) })
  })
})
