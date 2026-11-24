import { describe, expect, it } from "vitest"

import { businessToday, formatBusinessDate, formatBusinessDateTime } from "./today"

const dayOf = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()]

describe("businessToday", () => {
  it("is still today in São Paulo after 21h, when UTC is already tomorrow", () => {
    // 2026-10-24 22:30 in São Paulo (UTC-3) = 2026-10-25 01:30 UTC.
    expect(dayOf(businessToday(new Date("2026-10-25T01:30:00Z")))).toEqual([2026, 10, 24])
  })

  it("turns over at midnight in São Paulo", () => {
    expect(dayOf(businessToday(new Date("2026-10-25T03:00:00Z")))).toEqual([2026, 10, 25])
  })
})

describe("formatBusinessDateTime", () => {
  it("writes the time in Brasília, not the server's UTC", () => {
    // 2026-11-24 01:55 UTC = 2026-11-23 22:55 in São Paulo.
    expect(formatBusinessDateTime(new Date("2026-11-24T01:55:00Z"))).toBe("23/11/2026 às 22:55")
  })
})

describe("formatBusinessDate", () => {
  it("is still today in São Paulo after 21h", () => {
    expect(formatBusinessDate(new Date("2026-11-24T01:55:00Z"))).toBe("23/11/2026")
  })
})
