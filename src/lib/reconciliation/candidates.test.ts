import { describe, expect, it } from "vitest"

import {
  allocateTransaction,
  candidatePeriod,
  distinctValues,
  filterCandidates,
  sortCandidates,
  type CandidateFilters,
  type CandidateLike,
} from "./candidates"

const transactionDate = new Date(2026, 9, 20, 12) // 20/10/2026

function entry(overrides: Partial<CandidateLike> & { id?: string }) {
  return {
    id: "x",
    contactName: "Contato",
    description: "Descrição",
    categoryName: "Leilão",
    dueDate: transactionDate,
    amount: 10_000,
    settledAmount: null,
    ...overrides,
  }
}

const noFilters: CandidateFilters = {
  query: "",
  period: candidatePeriod("all", transactionDate),
  minAmount: 0,
  maxAmount: 0,
  contactNames: [],
  categoryNames: [],
}

describe("candidatePeriod", () => {
  it("counts the window around the transaction date, both ends inclusive", () => {
    const period = candidatePeriod("around15", transactionDate)
    expect(period.from).toEqual(new Date(2026, 9, 5))
    expect(period.to).toEqual(new Date(2026, 10, 4))
  })

  it("covers the transaction's month", () => {
    const period = candidatePeriod("transactionMonth", transactionDate)
    expect(period.from).toEqual(new Date(2026, 9, 1))
    expect(period.to).toEqual(new Date(2026, 9, 31))
  })
})

describe("filterCandidates", () => {
  it("matches contact or description ignoring case and accents", () => {
    const entries = [
      entry({ id: "a", contactName: "João Amâncio" }),
      entry({ id: "b", description: "Leilão GIR" }),
      entry({ id: "c" }),
    ]
    expect(filterCandidates(entries, { ...noFilters, query: "joao" }).map((e) => e.id)).toEqual(["a"])
    expect(filterCandidates(entries, { ...noFilters, query: "LEILAO" }).map((e) => e.id)).toEqual(["b"])
  })

  it("keeps due dates inside the period, edges included", () => {
    const period = candidatePeriod("around15", transactionDate)
    const entries = [
      entry({ id: "first", dueDate: new Date(2026, 9, 5, 12) }),
      entry({ id: "last", dueDate: new Date(2026, 10, 4, 12) }),
      entry({ id: "before", dueDate: new Date(2026, 9, 4, 12) }),
      entry({ id: "after", dueDate: new Date(2026, 10, 5, 12) }),
    ]
    expect(filterCandidates(entries, { ...noFilters, period }).map((e) => e.id)).toEqual(["first", "last"])
  })

  it("filters the amount range by what is still open, not the original amount", () => {
    const partial = entry({ id: "partial", amount: 10_000, settledAmount: 6_000 }) // 4.000 em aberto
    expect(filterCandidates([partial], { ...noFilters, maxAmount: 5_000 })).toHaveLength(1)
    expect(filterCandidates([partial], { ...noFilters, minAmount: 5_000 })).toHaveLength(0)
  })

  it("filters by the chosen contacts and categories", () => {
    const entries = [
      entry({ id: "a", contactName: "Ana", categoryName: "Leilão" }),
      entry({ id: "b", contactName: "Bia", categoryName: "Comissão" }),
    ]
    expect(filterCandidates(entries, { ...noFilters, contactNames: ["Bia"] }).map((e) => e.id)).toEqual(["b"])
    expect(filterCandidates(entries, { ...noFilters, categoryNames: ["Leilão"] }).map((e) => e.id)).toEqual(["a"])
  })
})

describe("sortCandidates", () => {
  const transaction = { amount: 5_000, date: transactionDate }

  it("puts exact open amounts first, then the due date closest to the transaction", () => {
    const entries = [
      entry({ id: "far", dueDate: new Date(2026, 8, 1) }),
      entry({ id: "near", dueDate: new Date(2026, 9, 21) }),
      entry({ id: "exact-far", amount: 5_000, dueDate: new Date(2026, 11, 1) }),
    ]
    expect(sortCandidates(entries, { field: "relevance", direction: "asc" }, transaction).map((e) => e.id)).toEqual([
      "exact-far",
      "near",
      "far",
    ])
  })

  it("sorts a column both ways", () => {
    const entries = [entry({ id: "b", amount: 2_000 }), entry({ id: "a", amount: 1_000 })]
    const asc = sortCandidates(entries, { field: "openAmount", direction: "asc" }, transaction)
    const desc = sortCandidates(entries, { field: "openAmount", direction: "desc" }, transaction)
    expect(asc.map((e) => e.id)).toEqual(["a", "b"])
    expect(desc.map((e) => e.id)).toEqual(["b", "a"])
  })
})

describe("distinctValues", () => {
  it("returns sorted unique values", () => {
    expect(distinctValues([{ n: "Bia" }, { n: "Ana" }, { n: "Bia" }], (e) => e.n)).toEqual(["Ana", "Bia"])
  })
})

describe("allocateTransaction", () => {
  const item = (open: number, adjustments: Partial<{ interest: number; fine: number; discount: number }> = {}) => ({
    open,
    interest: 0,
    fine: 0,
    discount: 0,
    ...adjustments,
  })

  it("bank 100 against an entry of 200: receives 100, 100 stays open", () => {
    expect(allocateTransaction(10_000, [item(20_000)])).toEqual([10_000])
  })

  it("bank 523,45 against an entry of 500: receives 500, the 23,45 goes to interest and fine", () => {
    expect(allocateTransaction(52_345, [item(50_000)])).toEqual([50_000])
    expect(allocateTransaction(52_345, [item(50_000, { interest: 2_000, fine: 345 })])).toEqual([50_000])
  })

  it("settles only what the transaction covers, leaving the rest open", () => {
    expect(allocateTransaction(1_462_220, [item(1_472_220)])).toEqual([1_462_220])
  })

  it("keeps the received amount when interest goes past the gap, so the total overshoots", () => {
    // 523,45 com 30,00 de juros: recebido continua 500 e o total passa 6,55.
    expect(allocateTransaction(52_345, [item(50_000, { interest: 3_000 })])).toEqual([50_000])
  })

  it("lets a discount settle the whole entry with a smaller transaction", () => {
    expect(allocateTransaction(48_000, [item(50_000, { discount: 2_000 })])).toEqual([50_000])
  })

  it("stops at the open amount when the transaction is bigger", () => {
    expect(allocateTransaction(-15_000, [item(10_000)])).toEqual([10_000])
  })

  it("fills entries in selection order, the last one partial, and zero once the money runs out", () => {
    expect(allocateTransaction(15_000, [item(10_000), item(10_000), item(10_000)])).toEqual([10_000, 5_000, 0])
  })
})
