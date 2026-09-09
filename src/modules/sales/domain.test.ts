import { describe, expect, it } from "vitest"

import { BusinessError } from "@/shared/errors"
import {
  calculateAllocations,
  generateInstallments,
  generateRecurringInstallments,
  RECURRING_ROLLING_WINDOW,
} from "./domain"

describe("generateInstallments", () => {
  it("splits R$ 60.000 in 12x with the residual on the last installment", () => {
    const installments = generateInstallments({
      totalAmount: 6_000_000,
      count: 12,
      firstDueDate: new Date(2026, 7, 10),
      frequency: "MONTHLY",
    })

    expect(installments).toHaveLength(12)
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBe(6_000_000)
    expect(installments[0].amount).toBe(500_000)
    expect(installments[11].amount).toBe(500_000)
  })

  it("puts the rounding residual on the last installment", () => {
    const installments = generateInstallments({
      totalAmount: 1000,
      count: 3,
      firstDueDate: new Date(2026, 0, 1),
      frequency: "MONTHLY",
    })

    expect(installments.map((i) => i.amount)).toEqual([333, 333, 334])
  })

  it("advances due dates by the given frequency", () => {
    const installments = generateInstallments({
      totalAmount: 300,
      count: 3,
      firstDueDate: new Date(2026, 0, 15),
      frequency: "MONTHLY",
    })

    expect(installments.map((i) => i.dueDate.getMonth())).toEqual([0, 1, 2])
  })

  it("rejects fewer than one installment", () => {
    expect(() =>
      generateInstallments({
        totalAmount: 100,
        count: 0,
        firstDueDate: new Date(),
        frequency: "MONTHLY",
      }),
    ).toThrow(BusinessError)
  })

  it("a single installment (venda avulsa) is the full amount", () => {
    const installments = generateInstallments({
      totalAmount: 12345,
      count: 1,
      firstDueDate: new Date(2026, 0, 1),
      frequency: "MONTHLY",
    })

    expect(installments).toEqual([
      { installmentNumber: 1, dueDate: new Date(2026, 0, 1), amount: 12345 },
    ])
  })
})

describe("generateRecurringInstallments", () => {
  it("with no end date, generates a fixed rolling window, each at the full amount", () => {
    const installments = generateRecurringInstallments({
      amountPerOccurrence: 50_000,
      firstDueDate: new Date(2026, 0, 10),
      frequency: "MONTHLY",
      endDate: null,
    })

    expect(installments).toHaveLength(RECURRING_ROLLING_WINDOW)
    expect(installments.every((i) => i.amount === 50_000)).toBe(true)
  })

  it("with an end date, generates one occurrence per period up to it, inclusive", () => {
    const installments = generateRecurringInstallments({
      amountPerOccurrence: 10_000,
      firstDueDate: new Date(2026, 0, 1),
      frequency: "MONTHLY",
      endDate: new Date(2026, 3, 1),
    })

    expect(installments.map((i) => i.installmentNumber)).toEqual([1, 2, 3, 4])
    expect(installments[3].dueDate).toEqual(new Date(2026, 3, 1))
    expect(installments.every((i) => i.amount === 10_000)).toBe(true)
  })

  it("rejects an end date before the first due date", () => {
    expect(() =>
      generateRecurringInstallments({
        amountPerOccurrence: 1000,
        firstDueDate: new Date(2026, 5, 1),
        frequency: "MONTHLY",
        endDate: new Date(2026, 0, 1),
      }),
    ).toThrow(BusinessError)
  })

  it("rejects an end date that would generate an unreasonable number of occurrences", () => {
    expect(() =>
      generateRecurringInstallments({
        amountPerOccurrence: 1000,
        firstDueDate: new Date(2020, 0, 1),
        frequency: "WEEKLY",
        endDate: new Date(2040, 0, 1),
      }),
    ).toThrow(BusinessError)
  })
})

describe("calculateAllocations", () => {
  it("returns zero allocations when there are no beneficiaries", () => {
    expect(calculateAllocations(1000, "PERCENTAGE", [])).toEqual([])
  })

  it("splits a 60/40 percentage repasse that closes exactly on the total", () => {
    const allocations = calculateAllocations(6_000_000, "PERCENTAGE", [
      { beneficiaryId: "a", value: 60 },
      { beneficiaryId: "b", value: 40 },
    ])

    expect(allocations.reduce((sum, a) => sum + a.amount, 0)).toBe(6_000_000)
    expect(allocations[0]).toMatchObject({ beneficiaryId: "a", amount: 3_600_000, percentage: 60 })
    expect(allocations[1]).toMatchObject({ beneficiaryId: "b", amount: 2_400_000, percentage: 40 })
  })

  it("puts the percentage rounding residual on the last allocation", () => {
    const allocations = calculateAllocations(100, "PERCENTAGE", [
      { beneficiaryId: "a", value: 33 },
      { beneficiaryId: "b", value: 33 },
      { beneficiaryId: "c", value: 34 },
    ])

    expect(allocations.map((a) => a.amount).reduce((sum, a) => sum + a, 0)).toBe(100)
  })

  it("rejects percentages that don't add up to 100", () => {
    expect(() =>
      calculateAllocations(1000, "PERCENTAGE", [{ beneficiaryId: "a", value: 60 }]),
    ).toThrow(BusinessError)
  })

  it("accepts fixed amounts that add up to the total", () => {
    const allocations = calculateAllocations(1000, "FIXED_AMOUNT", [
      { beneficiaryId: "a", value: 700 },
      { beneficiaryId: "b", value: 300 },
    ])

    expect(allocations).toEqual([
      { beneficiaryId: "a", mode: "FIXED_AMOUNT", percentage: null, amount: 700, order: 0 },
      { beneficiaryId: "b", mode: "FIXED_AMOUNT", percentage: null, amount: 300, order: 1 },
    ])
  })

  it("rejects fixed amounts that don't add up to the total", () => {
    expect(() =>
      calculateAllocations(1000, "FIXED_AMOUNT", [{ beneficiaryId: "a", value: 900 }]),
    ).toThrow(BusinessError)
  })
})
