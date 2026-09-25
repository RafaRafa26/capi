import { describe, expect, it } from "vitest"

import {
  applyChips,
  buildPageItems,
  computeSummary,
  deriveStatus,
  filterByPeriod,
  filterBySearch,
  getPeriodRange,
  paginate,
  periodLabel,
  shiftPeriod,
  sortEntries,
  totalPages,
  type FilterChips,
} from "./filter"

const today = new Date(2026, 8, 23) // 23/09/2026

interface FakeEntry {
  dueDate: Date
  paidAt: Date | null
  amount: number
  contactName: string
  description: string
  categoryName: string
  paymentMethod: string
  bankAccountName: string
  beneficiaryNames: string[]
}

function entry(overrides: Partial<FakeEntry>): FakeEntry {
  return {
    dueDate: today,
    paidAt: null,
    amount: 1_000,
    contactName: "Contato",
    description: "Descrição",
    categoryName: "Categoria",
    paymentMethod: "PIX",
    bankAccountName: "Asaas",
    beneficiaryNames: [],
    ...overrides,
  }
}

describe("deriveStatus", () => {
  it("is PAID when paidAt is set, regardless of due date", () => {
    expect(deriveStatus({ dueDate: new Date(2026, 0, 1), paidAt: new Date(2026, 0, 2) }, today)).toBe("PAID")
  })

  it("is OVERDUE when due date is before today and unpaid", () => {
    expect(deriveStatus({ dueDate: new Date(2026, 8, 20), paidAt: null }, today)).toBe("OVERDUE")
  })

  it("is DUE_TODAY when due date is today and unpaid", () => {
    expect(deriveStatus({ dueDate: today, paidAt: null }, today)).toBe("DUE_TODAY")
  })

  it("is UPCOMING when due date is after today and unpaid", () => {
    expect(deriveStatus({ dueDate: new Date(2026, 8, 30), paidAt: null }, today)).toBe("UPCOMING")
  })
})

describe("getPeriodRange", () => {
  it("computes the current month range", () => {
    const range = getPeriodRange("month", today)
    expect(range.from).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0))
    expect(range.to?.getDate()).toBe(30)
  })

  it("returns null bounds for 'all'", () => {
    const range = getPeriodRange("all", today)
    expect(range.from).toBeNull()
    expect(range.to).toBeNull()
  })

  it("computes last 30 days ending today", () => {
    const range = getPeriodRange("last30", today)
    expect(range.to?.getDate()).toBe(23)
    expect(range.from?.getDate()).toBe(25) // 30 days back lands in August
  })
})

describe("shiftPeriod", () => {
  it("moves the month range forward", () => {
    const month = getPeriodRange("month", today)
    const next = shiftPeriod(month, 1)
    expect(next.from?.getMonth()).toBe(9)
  })

  it("moves the month range backward", () => {
    const month = getPeriodRange("month", today)
    const prev = shiftPeriod(month, -1)
    expect(prev.from?.getMonth()).toBe(7)
  })

  it("does not shift 'all' or 'custom' presets", () => {
    const all = getPeriodRange("all", today)
    expect(shiftPeriod(all, 1)).toEqual(all)
    const custom = getPeriodRange("custom", today, { from: today, to: today })
    expect(shiftPeriod(custom, 1)).toEqual(custom)
  })

  it("slides the last30 window by its own span", () => {
    const last30 = getPeriodRange("last30", today)
    const prev = shiftPeriod(last30, -1)
    expect(prev.to?.getTime()).toBe(last30.from!.getTime() - 1)
  })
})

describe("periodLabel", () => {
  it("shows 'Este mês' for the current month", () => {
    expect(periodLabel(getPeriodRange("month", today), today)).toBe("Este mês")
  })

  it("shows an explicit month name after shifting away from the current month", () => {
    const shifted = shiftPeriod(getPeriodRange("month", today), 1)
    expect(periodLabel(shifted, today)).toMatch(/Outubro/i)
  })

  it("shows 'Todo o período' for the all preset", () => {
    expect(periodLabel(getPeriodRange("all", today), today)).toBe("Todo o período")
  })
})

describe("filterByPeriod", () => {
  const entries = [
    entry({ dueDate: new Date(2026, 8, 1) }),
    entry({ dueDate: new Date(2026, 8, 23) }),
    entry({ dueDate: new Date(2026, 9, 5) }),
  ]

  it("keeps only entries inside the range", () => {
    const range = getPeriodRange("month", today)
    const filtered = filterByPeriod(entries, range)
    expect(filtered).toHaveLength(2)
  })

  it("returns everything when the range has no bounds", () => {
    const range = getPeriodRange("all", today)
    expect(filterByPeriod(entries, range)).toHaveLength(3)
  })
})

describe("filterBySearch", () => {
  const entries = [
    entry({ contactName: "João Pereira", description: "Aluguel" }),
    entry({ contactName: "Maria Souza", description: "Consultoria" }),
  ]

  it("matches by contact name", () => {
    expect(filterBySearch(entries, "joão")).toHaveLength(1)
  })

  it("matches by description", () => {
    expect(filterBySearch(entries, "consultoria")).toHaveLength(1)
  })

  it("returns everything for an empty query", () => {
    expect(filterBySearch(entries, "  ")).toHaveLength(2)
  })
})

describe("applyChips", () => {
  const entries = [
    entry({ categoryName: "Vendas", paymentMethod: "PIX" }),
    entry({ categoryName: "Vendas", paymentMethod: "Boleto" }),
    entry({ categoryName: "Aluguel", paymentMethod: "PIX" }),
  ]

  it("combines values within the same filter with OR", () => {
    const chips: FilterChips = { category: ["Vendas", "Aluguel"] }
    expect(applyChips(entries, chips)).toHaveLength(3)
  })

  it("combines different filters with AND", () => {
    const chips: FilterChips = { category: ["Vendas"], paymentMethod: ["Boleto"] }
    expect(applyChips(entries, chips)).toHaveLength(1)
  })

  it("ignores chip keys with no selected values", () => {
    const chips: FilterChips = { category: ["Vendas"], paymentMethod: [] }
    expect(applyChips(entries, chips)).toHaveLength(2)
  })

  it("matches a multi-valued field (Favorecido) when any of its values is selected", () => {
    const withBeneficiaries = [
      entry({ description: "A", beneficiaryNames: ["Ana", "Bruno"] }),
      entry({ description: "B", beneficiaryNames: ["Bruno"] }),
      entry({ description: "C", beneficiaryNames: [] }),
    ]
    const chips: FilterChips = { contact: ["Ana"] }
    expect(applyChips(withBeneficiaries, chips).map((e) => e.description)).toEqual(["A"])
  })

  it("excludes entries with no favorecido when the Favorecido chip is active", () => {
    const withBeneficiaries = [
      entry({ description: "A", beneficiaryNames: ["Ana"] }),
      entry({ description: "B", beneficiaryNames: [] }),
    ]
    const chips: FilterChips = { contact: ["Ana", "Bruno"] }
    expect(applyChips(withBeneficiaries, chips).map((e) => e.description)).toEqual(["A"])
  })
})

describe("sortEntries", () => {
  const entries = [
    entry({ description: "B", amount: 300, dueDate: new Date(2026, 8, 10) }),
    entry({ description: "A", amount: 100, dueDate: new Date(2026, 8, 20) }),
    entry({ description: "C", amount: 200, dueDate: new Date(2026, 8, 5) }),
  ]

  it("sorts by dueDate ascending", () => {
    const sorted = sortEntries(entries, { field: "dueDate", direction: "asc" })
    expect(sorted.map((e) => e.description)).toEqual(["C", "B", "A"])
  })

  it("sorts by amount descending", () => {
    const sorted = sortEntries(entries, { field: "amount", direction: "desc" })
    expect(sorted.map((e) => e.description)).toEqual(["B", "C", "A"])
  })

  it("sorts by description using pt-BR collation", () => {
    const sorted = sortEntries(entries, { field: "description", direction: "asc" })
    expect(sorted.map((e) => e.description)).toEqual(["A", "B", "C"])
  })
})

describe("computeSummary", () => {
  it("buckets entries by derived status and sums amounts", () => {
    const entries = [
      entry({ dueDate: new Date(2026, 8, 20), amount: 100 }), // overdue
      entry({ dueDate: today, amount: 200 }), // due today
      entry({ dueDate: new Date(2026, 8, 30), amount: 300 }), // upcoming
      entry({ dueDate: new Date(2026, 8, 1), paidAt: new Date(2026, 8, 2), amount: 400 }), // paid
    ]
    const summary = computeSummary(entries, today)
    expect(summary.overdue).toEqual({ count: 1, total: 100 })
    expect(summary.dueToday).toEqual({ count: 1, total: 200 })
    expect(summary.upcoming).toEqual({ count: 1, total: 300 })
    expect(summary.paid).toEqual({ count: 1, total: 400 })
    expect(summary.total).toEqual({ count: 4, total: 1000 })
  })
})

describe("pagination", () => {
  const entries = Array.from({ length: 25 }, (_, index) => index)

  it("slices the requested page", () => {
    expect(paginate(entries, 2, 10)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  })

  it("computes total pages", () => {
    expect(totalPages(25, 10)).toBe(3)
    expect(totalPages(0, 10)).toBe(1)
  })
})

describe("buildPageItems", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(buildPageItems(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("collapses with a single ellipsis when the current page is near the start", () => {
    expect(buildPageItems(1, 10)).toEqual([1, 2, 3, "ellipsis", 10])
  })

  it("shows first, last and two neighbors around the current page", () => {
    expect(buildPageItems(5, 10)).toEqual([1, "ellipsis", 3, 4, 5, 6, 7, "ellipsis", 10])
  })

  it("collapses with a single ellipsis when the current page is near the end", () => {
    expect(buildPageItems(10, 10)).toEqual([1, "ellipsis", 8, 9, 10])
  })
})
