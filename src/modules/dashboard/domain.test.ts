import { describe, expect, it } from "vitest"

import { bucketEntries, buildBalanceSeries, getFlowPeriod, type BucketableEntry } from "./domain"

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

describe("getFlowPeriod", () => {
  const ref = new Date(2026, 8, 29, 15, 30)

  it("ends the 'últimos N dias' presets today", () => {
    expect(getFlowPeriod("last7", ref)).toEqual({ from: new Date(2026, 8, 23), to: new Date(2026, 8, 29) })
    expect(getFlowPeriod("last30", ref).from).toEqual(new Date(2026, 7, 31))
  })

  it("covers the whole current month, quarter and year", () => {
    expect(getFlowPeriod("month", ref)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 8, 30) })
    expect(getFlowPeriod("quarter", ref)).toEqual({ from: new Date(2026, 6, 1), to: new Date(2026, 8, 30) })
    expect(getFlowPeriod("year", ref)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2026, 11, 31) })
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
    ])
  })

  it("stops at today even when the period runs further", () => {
    const series = buildBalanceSeries({ ...base, realized: [] })
    expect(series.at(-1)?.day).toBe("2026-09-29")
  })
})
