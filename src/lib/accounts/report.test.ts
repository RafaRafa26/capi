import { describe, expect, it } from "vitest"

import type { AccountEntry } from "@/modules/accounts/types"

import { buildAccountsReport, NO_BENEFICIARY_LABEL } from "./report"

const today = new Date(2026, 9, 2) // 02/10/2026

let nextId = 0
function entry(overrides: Partial<AccountEntry>): AccountEntry {
  nextId += 1
  return {
    id: `e${nextId}`,
    kind: "rec",
    contactId: "c1",
    contactName: "Cliente",
    description: "Parcela",
    categoryId: "cat1",
    categoryName: "Receita - Vendas",
    paymentMethod: "Pix",
    paymentMethodCode: "PIX",
    bankAccountId: null,
    bankAccountName: null,
    dueDate: new Date(2026, 8, 20),
    paidAt: null,
    amount: 10_000,
    settledAmount: 0,
    interest: 0,
    fine: 0,
    discount: 0,
    settlements: [],
    allocations: [],
    beneficiaryIds: [],
    beneficiaryNames: [],
    entryStatus: "FORECAST",
    marker: null,
    notes: null,
    notesUpdatedAt: null,
    ...overrides,
  }
}

function build(entries: AccountEntry[], query = "period=all", kind: "rec" | "pay" = "rec") {
  return buildAccountsReport({
    entries,
    kind,
    params: new URLSearchParams(query),
    organizationName: "Capi Demo",
    today,
  })
}

describe("buildAccountsReport", () => {
  it("groups receivables by favorecido, alphabetically, with 'Sem favorecido' last", () => {
    const report = build([
      entry({ beneficiaryNames: ["Zeca"] }),
      entry({ beneficiaryNames: [] }),
      entry({ beneficiaryNames: ["Ana"] }),
    ])
    expect(report.groups.map((group) => group.name)).toEqual(["Ana", "Zeca", NO_BENEFICIARY_LABEL])
  })

  it("groups payables by the contact, who is the one being paid", () => {
    const report = build(
      [entry({ kind: "pay", contactName: "Fornecedor B" }), entry({ kind: "pay", contactName: "Fornecedor A" })],
      "period=all",
      "pay",
    )
    expect(report.groups.map((group) => group.name)).toEqual(["Fornecedor A", "Fornecedor B"])
    expect(report.groupLabel).toBe("Fornecedor")
  })

  it("lists a split entry under each favorecido but counts it once in the total", () => {
    const report = build([entry({ beneficiaryNames: ["Ana", "Bia"], amount: 10_000 })])
    expect(report.groups).toHaveLength(2)
    expect(report.groups[0].openTotal).toBe(10_000)
    expect(report.groups[0].entries[0].sharedWith).toEqual(["Bia"])
    expect(report.totals.open).toBe(10_000)
    expect(report.totals.count).toBe(1)
  })

  it("totals the open amount of the listed entries, not their face value", () => {
    const report = build([
      entry({ amount: 20_000, settledAmount: 7_500 }),
      entry({ amount: 5_000, settledAmount: 5_000, paidAt: new Date(2026, 8, 25) }),
    ])
    expect(report.totals.amount).toBe(25_000)
    expect(report.totals.settled).toBe(12_500)
    expect(report.totals.open).toBe(12_500)
  })

  it("respects the status card filter, unlike the screen's period summary", () => {
    const report = build([
      entry({ dueDate: new Date(2026, 8, 1) }), // vencido
      entry({ dueDate: new Date(2026, 10, 1), amount: 99_000 }), // a vencer
    ], "period=all&card=OVERDUE")
    expect(report.totals.count).toBe(1)
    expect(report.totals.open).toBe(10_000)
    expect(report.filtersLabel).toBe("Situação: Vencido")
  })

  it("only opens sections for the filtered favorecidos", () => {
    const report = build([entry({ beneficiaryNames: ["Ana", "Bia"] })], "period=all&f_contact=Ana")
    expect(report.groups.map((group) => group.name)).toEqual(["Ana"])
    expect(report.filtersLabel).toBe("Favorecido: Ana")
  })

  it("labels the period with explicit dates", () => {
    expect(build([], "period=all").periodLabel).toBe("Todo o período")
    expect(build([], "period=month").periodLabel).toBe("01/10/2026 – 31/10/2026")
  })
})
