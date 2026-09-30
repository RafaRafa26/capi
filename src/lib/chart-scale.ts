// Y scale for balance line charts (Visão geral, Conciliação): round reference
// ticks ("5k", "10k", "20k"...) and a domain that keeps the line around the
// middle of the plot, with reference values both above and below it.

/** Smallest 1/2/5 × 10ⁿ step that is ≥ `raw` (in cents, so R$ 1 minimum). */
function niceStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(raw, 100)))
  for (const factor of [1, 2, 5, 10]) {
    if (factor * magnitude >= raw) return factor * magnitude
  }
  return 10 * magnitude
}

export function balanceAxisScale(values: number[], tickCount = 5): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) return { domain: [0, 100_000], ticks: [0, 25_000, 50_000, 75_000, 100_000] }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const center = (min + max) / 2
  // The data spans ~60% of the plot; a flat (or nearly flat) series still gets
  // a band around it proportional to its level, at least R$ 10 each way.
  const half = Math.max(((max - min) / 2) * 1.6, Math.abs(center) * 0.25, 1_000)

  const step = niceStep((half * 2) / (tickCount - 1))
  let lo = Math.floor((center - half) / step) * step
  let hi = Math.ceil((center + half) / step) * step
  // Rounding outwards can leave the line off-center — even it out with one more step.
  if (center - lo > hi - center + step / 2) hi += step
  else if (hi - center > center - lo + step / 2) lo -= step

  const ticks: number[] = []
  for (let tick = lo; tick <= hi + step / 2; tick += step) ticks.push(tick)
  return { domain: [lo, hi], ticks }
}
