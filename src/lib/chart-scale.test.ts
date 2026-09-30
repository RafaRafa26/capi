import { describe, expect, it } from "vitest"

import { balanceAxisScale } from "./chart-scale"

describe("balanceAxisScale", () => {
  it("uses round 1/2/5 steps as ticks", () => {
    const { ticks } = balanceAxisScale([3_000_000, 4_390_000])
    const step = ticks[1] - ticks[0]
    expect([1, 2, 5]).toContain(step / 10 ** Math.floor(Math.log10(step)))
    for (const tick of ticks) expect(tick % step).toBe(0)
  })

  it("keeps a flat line in the middle, with ticks above and below", () => {
    const { domain, ticks } = balanceAxisScale([4_390_000, 4_390_000])
    const position = (4_390_000 - domain[0]) / (domain[1] - domain[0])
    expect(position).toBeGreaterThan(0.3)
    expect(position).toBeLessThan(0.7)
    expect(ticks.some((t) => t < 4_390_000)).toBe(true)
    expect(ticks.some((t) => t > 4_390_000)).toBe(true)
  })

  it("handles an all-zero series", () => {
    const { domain, ticks } = balanceAxisScale([0, 0, 0])
    expect(domain[0]).toBeLessThan(0)
    expect(domain[1]).toBeGreaterThan(0)
    expect(ticks).toContain(0)
  })
})
