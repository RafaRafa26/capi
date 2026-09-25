// URL query-param encoding for the accounts screens' filters — shared
// between the client view (accounts-view.tsx) and the server-rendered PDF
// report (app/reports/accounts), so "Exportar" produces a report that
// matches exactly what's on screen, one URLSearchParams read of the other.
import { getPeriodRange, type FilterChipKey, type FilterChips, type PeriodPreset, type PeriodRange } from "./filter"

export const chipOrder: FilterChipKey[] = ["contact", "category", "paymentMethod", "bankAccount"]

export function encodeChipValues(values: string[]): string {
  return values.map(encodeURIComponent).join(",")
}

export function decodeChipValues(raw: string): string[] {
  if (!raw) return []
  return raw.split(",").map(decodeURIComponent)
}

export function parsePeriodFromParams(params: URLSearchParams, today: Date): PeriodRange {
  const preset = (params.get("period") as PeriodPreset) || "month"
  if (preset === "custom") {
    const fromRaw = params.get("from")
    const toRaw = params.get("to")
    if (fromRaw && toRaw) {
      return getPeriodRange("custom", today, { from: new Date(fromRaw), to: new Date(toRaw) })
    }
    return getPeriodRange("month", today)
  }
  return getPeriodRange(preset, today)
}

export function parseChipsFromParams(params: URLSearchParams): FilterChips {
  const chips: FilterChips = {}
  for (const key of chipOrder) {
    const paramKey = `f_${key}`
    if (params.has(paramKey)) {
      chips[key] = decodeChipValues(params.get(paramKey) ?? "")
    }
  }
  return chips
}
