import { describe, expect, it } from "vitest"

import {
  allocatedPercent,
  buildPayload,
  draftForNext,
  emptyDraft,
  generateSchedule,
  isDraftDirty,
  scheduleKey,
  switchKind,
  withInstallmentsTotal,
  type EntryDraft,
} from "./draft"

const today = new Date(2026, 11, 10, 12)

function draft(patch: Partial<EntryDraft> = {}): EntryDraft {
  return { ...emptyDraft("sale", today), ...patch }
}

describe("generateSchedule", () => {
  it("makes a single installment for an avulsa entry, whatever the count field says", () => {
    const schedule = generateSchedule(draft({ amount: 50000, installmentsCount: 6 }))
    expect(schedule).toHaveLength(1)
    expect(schedule[0]).toMatchObject({ installmentNumber: 1, amount: 50000 })
  })

  it("splits the total for parcelada, with the residual on the last one", () => {
    const schedule = generateSchedule(draft({ amount: 10000, repetition: "installments", installmentsCount: 3 }))
    expect(schedule.map((i) => i.amount)).toEqual([3333, 3333, 3334])
  })

  it("repeats the amount for recorrente with no end date, in a rolling window", () => {
    const schedule = generateSchedule(draft({ amount: 25000, repetition: "recurring" }))
    expect(schedule).toHaveLength(3)
    expect(schedule.every((i) => i.amount === 25000)).toBe(true)
  })

  it("returns an empty schedule while the end date is before the first due date", () => {
    const schedule = generateSchedule(
      draft({ amount: 25000, repetition: "recurring", recurrenceEndDate: new Date(2026, 10, 1, 12) }),
    )
    expect(schedule).toEqual([])
  })
})

describe("scheduleKey", () => {
  it("ignores the installment count for an avulsa entry", () => {
    expect(scheduleKey(draft({ installmentsCount: 2 }))).toBe(scheduleKey(draft({ installmentsCount: 9 })))
  })

  it("changes when a field the schedule comes from changes", () => {
    expect(scheduleKey(draft({ amount: 1 }))).not.toBe(scheduleKey(draft({ amount: 2 })))
    expect(scheduleKey(draft({ repetition: "recurring" }))).not.toBe(
      scheduleKey(draft({ repetition: "recurring", recurrenceEndDate: new Date(2027, 5, 1) })),
    )
  })
})

describe("switchKind", () => {
  it("keeps shared fields and clears contact, category and repasse", () => {
    const sale = draft({
      amount: 9900,
      description: "Consultoria",
      contactId: "c1",
      categoryId: "cat1",
      bankAccountId: "b1",
      allocationEnabled: true,
      allocations: [{ id: "r1", beneficiaryId: "x", value: 100 }],
    })
    const expense = switchKind(sale, "expense")
    expect(expense).toMatchObject({
      kind: "expense",
      amount: 9900,
      description: "Consultoria",
      bankAccountId: "b1",
      contactId: "",
      categoryId: "",
      allocationEnabled: false,
      allocations: [],
    })
  })
})

describe("draftForNext", () => {
  it("keeps what repeats in a batch and clears the rest", () => {
    const next = draftForNext(
      draft({
        amount: 9900,
        description: "Consultoria",
        contactId: "c1",
        categoryId: "cat1",
        bankAccountId: "b1",
        paymentMethod: "PIX",
        repetition: "installments",
        installmentsCount: 4,
      }),
      today,
    )
    expect(next).toMatchObject({
      kind: "sale",
      categoryId: "cat1",
      bankAccountId: "b1",
      paymentMethod: "PIX",
      repetition: "installments",
      installmentsCount: 4,
      amount: 0,
      description: "",
      contactId: "",
    })
    expect(isDraftDirty(next)).toBe(false)
  })
})

describe("isDraftDirty", () => {
  it("is clean for a fresh draft and dirty once something is typed", () => {
    expect(isDraftDirty(draft())).toBe(false)
    expect(isDraftDirty(draft({ amount: 1 }))).toBe(true)
    expect(isDraftDirty(draft({ description: "  " }))).toBe(false)
    expect(isDraftDirty(draft({ description: "x" }))).toBe(true)
  })
})

describe("allocatedPercent", () => {
  it("sums percentages directly", () => {
    const d = draft({
      allocations: [
        { id: "a", beneficiaryId: "x", value: 30 },
        { id: "b", beneficiaryId: "y", value: 10 },
      ],
    })
    expect(allocatedPercent(d)).toBe(40)
  })

  it("converts fixed amounts into a share of the total", () => {
    const d = draft({
      amount: 20000,
      allocationMode: "FIXED_AMOUNT",
      allocations: [{ id: "a", beneficiaryId: "x", value: 5000 }],
    })
    expect(allocatedPercent(d)).toBe(25)
  })
})

describe("buildPayload", () => {
  it("sends a recurring sale as RECURRING with its end date", () => {
    const end = new Date(2027, 5, 10, 12)
    const d = draft({ amount: 1000, repetition: "recurring", recurrenceEndDate: end })
    const payload = buildPayload(d, generateSchedule(d))
    expect(payload).toMatchObject({ billingType: "RECURRING", recurrenceEndDate: end, totalAmount: 1000 })
  })

  it("drops the end date when the entry isn't recurring", () => {
    const d = draft({ amount: 1000, recurrenceEndDate: new Date(2027, 5, 10) })
    expect(buildPayload(d, generateSchedule(d))).toMatchObject({ billingType: "INSTALLMENTS", recurrenceEndDate: null })
  })

  it("sends repasse only when it's on and has rows", () => {
    const rows = [{ id: "a", beneficiaryId: "x", value: 100 }]
    expect(buildPayload(draft({ allocationEnabled: false, allocations: rows }), [])).toMatchObject({
      allocationMode: undefined,
      allocations: [],
    })
    expect(buildPayload(draft({ allocationEnabled: true, allocations: rows }), [])).toMatchObject({
      allocationMode: "PERCENTAGE",
      allocations: [{ beneficiaryId: "x", value: 100 }],
    })
  })

  it("never sends repasse fields for a despesa", () => {
    const payload = buildPayload(
      draft({ kind: "expense", allocationEnabled: true, allocations: [{ id: "a", beneficiaryId: "x", value: 100 }] }),
      [],
    )
    expect(payload).not.toHaveProperty("allocations")
    expect(payload).not.toHaveProperty("allocationMode")
  })
})

describe("withInstallmentsTotal", () => {
  it("moves a parcelada total to the sum of its edited installments", () => {
    const d = draft({ amount: 10000, repetition: "installments", installmentsCount: 2 })
    const edited = generateSchedule(d).map((i, index) => (index === 0 ? { ...i, amount: 7000 } : i))
    expect(withInstallmentsTotal(d, edited).amount).toBe(12000)
  })

  it("returns the same draft when nothing changes the total", () => {
    const d = draft({ amount: 10000, repetition: "installments", installmentsCount: 2 })
    expect(withInstallmentsTotal(d, generateSchedule(d))).toBe(d)
  })

  it("leaves recurring and avulsa amounts alone", () => {
    const recurring = draft({ amount: 5000, repetition: "recurring" })
    const edited = generateSchedule(recurring).map((i) => ({ ...i, amount: 9000 }))
    expect(withInstallmentsTotal(recurring, edited)).toBe(recurring)
    const single = draft({ amount: 5000 })
    expect(withInstallmentsTotal(single, [{ installmentNumber: 1, dueDate: today, amount: 1 }])).toBe(single)
  })
})
