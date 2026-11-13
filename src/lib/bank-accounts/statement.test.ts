import { describe, expect, it } from "vitest"

import type { BankAccountStatementLine } from "@/modules/bank-accounts/types"

import { fromParamMonth, parseStatementSeries, statementMonth, toParamMonth } from "./statement"

function line(id: string, date: Date, amount: number, runningBalance: number): BankAccountStatementLine {
  return { id, bankTransactionId: id, date, description: id, amount, runningBalance, entries: [] }
}

// Saldo inicial 1.000; julho +500; agosto +300, -200, +100; setembro -50.
const lines = [
  line("jul", new Date(2026, 6, 31, 12), 50_000, 150_000),
  line("ago-1", new Date(2026, 7, 1, 12), 30_000, 180_000),
  line("ago-2", new Date(2026, 7, 15, 12), -20_000, 160_000),
  line("ago-3", new Date(2026, 7, 31, 12), 10_000, 170_000),
  line("set", new Date(2026, 8, 1, 12), -5_000, 165_000),
]
const august = new Date(2026, 7, 1)

describe("statementMonth", () => {
  it("keeps the month's lines oldest first, with opening and closing balances", () => {
    const view = statementMonth(lines, 100_000, august, "saldo")
    expect(view.lines.map((l) => l.id)).toEqual(["ago-1", "ago-2", "ago-3"])
    expect(view.openingDate).toEqual(new Date(2026, 6, 31))
    expect(view.openingBalance).toBe(150_000)
    expect(view.closingBalance).toBe(170_000)
  })

  it("filters Entradas and Saídas but keeps the month totals unfiltered", () => {
    const entradas = statementMonth(lines, 100_000, august, "entradas")
    expect(entradas.lines.map((l) => l.id)).toEqual(["ago-1", "ago-3"])
    expect(statementMonth(lines, 100_000, august, "saidas").lines.map((l) => l.id)).toEqual(["ago-2"])
    expect(entradas.entradas).toBe(40_000)
    expect(entradas.saidas).toBe(20_000)
    expect(entradas.monthLines).toHaveLength(3)
  })

  it("uses the initial balance before the first line and carries it through an empty month", () => {
    const june = statementMonth(lines, 100_000, new Date(2026, 5, 1), "saldo")
    expect(june.lines).toEqual([])
    expect(june.openingBalance).toBe(100_000)
    expect(june.closingBalance).toBe(100_000)
  })
})

describe("month and series params", () => {
  it("round-trips the month and rejects garbage", () => {
    expect(fromParamMonth(toParamMonth(august))).toEqual(august)
    expect(fromParamMonth("2026-13")).toBeNull()
    expect(fromParamMonth(null)).toBeNull()
  })

  it("falls back to Saldo", () => {
    expect(parseStatementSeries("saidas")).toBe("saidas")
    expect(parseStatementSeries("x")).toBe("saldo")
  })
})
