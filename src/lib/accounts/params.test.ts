import { describe, expect, it } from "vitest"

import { getPeriodRange, shiftPeriod } from "./filter"
import { fromParamDate, parsePeriodFromParams, periodToParams, toParamDate } from "./params"

describe("custom period in the URL", () => {
  const today = new Date(2026, 10, 10)

  it("writes the local calendar day, even for the end of the day", () => {
    expect(toParamDate(new Date(2026, 10, 1, 0, 0))).toBe("2026-11-01")
    expect(toParamDate(new Date(2026, 10, 15, 23, 59, 59, 999))).toBe("2026-11-15")
  })

  it("reads back the same days it wrote", () => {
    const params = new URLSearchParams({ period: "custom", from: "2026-11-01", to: "2026-11-15" })
    const range = parsePeriodFromParams(params, today)
    expect(range.from && toParamDate(range.from)).toBe("2026-11-01")
    expect(range.to && toParamDate(range.to)).toBe("2026-11-15")
  })

  it("rejects malformed dates", () => {
    expect(fromParamDate("2026-13-01")).toBeNull()
    expect(fromParamDate("01/11/2026")).toBeNull()
    expect(fromParamDate(null)).toBeNull()
  })
})

describe("period arrows through the URL", () => {
  const today = new Date(2026, 10, 10)

  function roundTrip(range: ReturnType<typeof getPeriodRange>) {
    const encoded = periodToParams(range, today)
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(encoded)) if (value !== null) params.set(key, value)
    return { params, range: parsePeriodFromParams(params, today) }
  }

  it("keeps the current period relative to today", () => {
    const { params } = roundTrip(getPeriodRange("month", today))
    expect(params.toString()).toBe("period=month")
  })

  it.each(["today", "week", "month", "year"] as const)("keeps a %s shifted by the arrows", (preset) => {
    const previous = shiftPeriod(getPeriodRange(preset, today), -1)
    const { range } = roundTrip(previous)
    expect(range.preset).toBe(preset)
    expect(range.from?.getTime()).toBe(previous.from?.getTime())
    expect(range.to?.getTime()).toBe(previous.to?.getTime())
  })

  it("can step twice in a row", () => {
    const once = roundTrip(shiftPeriod(getPeriodRange("month", today), -1)).range
    const twice = roundTrip(shiftPeriod(once, -1)).range
    expect(toParamDate(twice.from!)).toBe("2026-09-01")
  })
})
