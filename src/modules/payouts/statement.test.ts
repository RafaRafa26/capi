import { describe, expect, it } from "vitest"

import { installmentLabel, sliceStatement, withRunningBalance } from "./statement"
import type { BeneficiaryStatementLine } from "./types"

function line(id: string, kind: "CREDIT" | "DEBIT", day: number, amount: number): BeneficiaryStatementLine {
  return {
    id,
    kind,
    date: new Date(2026, 7, day),
    dueDate: new Date(2026, 7, day),
    amount,
    title: id,
    description: "",
    entryId: id,
    status: kind === "DEBIT" ? "PENDING" : null,
    installmentLabel: null,
    balance: 0,
  }
}

describe("installmentLabel", () => {
  it("names installments, single sales and recurring charges", () => {
    expect(installmentLabel("INSTALLMENTS", 2, 5)).toBe("Parcela 2/5")
    expect(installmentLabel("INSTALLMENTS", 1, 1)).toBe("Avulso")
    expect(installmentLabel("RECURRING", 3, 1)).toBe("Recorrente nº 3")
  })
})

describe("withRunningBalance", () => {
  it("accumulates chronologically, credit before debit on the same day, oldest first", () => {
    const lines = withRunningBalance([
      line("payout", "DEBIT", 10, -1_000),
      line("b", "CREDIT", 10, 500),
      line("a", "CREDIT", 5, 1_000),
    ])
    expect(lines.map((l) => [l.id, l.balance])).toEqual([
      ["a", 1_000],
      ["b", 1_500],
      ["payout", 500],
    ])
  })
})

describe("sliceStatement", () => {
  const lines = withRunningBalance([
    line("a", "CREDIT", 1, 1_000),
    line("b", "CREDIT", 10, 2_000),
    line("payout", "DEBIT", 15, -2_500),
    line("c", "CREDIT", 25, 700),
  ])

  it("keeps the whole history when there is no period", () => {
    const slice = sliceStatement(lines, { from: null, to: null })
    expect(slice).toMatchObject({ openingBalance: 0, closingBalance: 1_200, credits: 3_700, debits: 2_500 })
    expect(slice.lines).toHaveLength(4)
  })

  it("carries the balance before the period as the opening balance", () => {
    const slice = sliceStatement(lines, { from: new Date(2026, 7, 5), to: new Date(2026, 7, 20) })
    expect(slice.lines.map((l) => l.id)).toEqual(["b", "payout"])
    expect(slice).toMatchObject({ openingBalance: 1_000, closingBalance: 500, credits: 2_000, debits: 2_500 })
  })

  it("keeps the opening balance as the closing one when the period is empty", () => {
    const slice = sliceStatement(lines, { from: new Date(2026, 7, 26), to: new Date(2026, 7, 30) })
    expect(slice).toMatchObject({ openingBalance: 1_200, closingBalance: 1_200, credits: 0, debits: 0, lines: [] })
  })
})
