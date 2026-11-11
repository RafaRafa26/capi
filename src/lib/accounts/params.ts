// URL query-param encoding for the accounts screens' filters — shared
// between the client view (accounts-view.tsx) and the PDF/XLSX export
// (lib/accounts/report.ts), so "Exportar" produces a report that matches
// exactly what's on screen, one URLSearchParams read of the other.
import { endOfDay, startOfDay } from "date-fns"

import { getPeriodRange, type FilterChipKey, type FilterChips, type PeriodPreset, type PeriodRange } from "./filter"

export const chipOrder: FilterChipKey[] = ["client", "contact", "category", "paymentMethod", "bankAccount", "marker"]

/**
 * Um dia do calendário na URL como `yyyy-MM-dd`, sempre pela data local.
 * `toISOString()` passaria por UTC: no Brasil o fim do dia vira o dia seguinte
 * e `new Date("2026-11-01")` volta como 31/10 às 21h.
 */
export function toParamDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

/** O inverso de toParamDate: meia-noite local, ou null se ausente ou inválido. */
export function fromParamDate(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  return date.getMonth() === month - 1 ? date : null
}

export function encodeChipValues(values: string[]): string {
  return values.map(encodeURIComponent).join(",")
}

export function decodeChipValues(raw: string): string[] {
  if (!raw) return []
  return raw.split(",").map(decodeURIComponent)
}

const PERIOD_PRESETS: PeriodPreset[] = ["today", "week", "month", "year", "last30", "last12months", "all", "custom"]

/**
 * O período nos params da URL. Um atalho no período atual ("Este mês") vai só
 * pelo nome, para o link continuar relativo a hoje; deslocado pelas setas
 * (outubro, 2025...) leva também as datas, senão voltaria para o atual.
 */
export function periodToParams(range: PeriodRange, today: Date): { period: string; from: string | null; to: string | null } {
  if (range.preset === "all" || !range.from || !range.to) return { period: range.preset, from: null, to: null }
  if (range.preset !== "custom") {
    const current = getPeriodRange(range.preset, today)
    if (current.from?.getTime() === range.from.getTime()) return { period: range.preset, from: null, to: null }
  }
  return { period: range.preset, from: toParamDate(range.from), to: toParamDate(range.to) }
}

export function parsePeriodFromParams(params: URLSearchParams, today: Date): PeriodRange {
  const raw = params.get("period") as PeriodPreset | null
  const preset = raw && PERIOD_PRESETS.includes(raw) ? raw : "month"
  const from = fromParamDate(params.get("from"))
  const to = fromParamDate(params.get("to"))

  if (preset === "custom") {
    return from && to ? getPeriodRange("custom", today, { from, to }) : getPeriodRange("month", today)
  }
  if (preset === "all" || !from || !to) return getPeriodRange(preset, today)

  switch (preset) {
    // Atalho de calendário: o dia, a semana, o mês ou o ano que contém `from`.
    case "today":
    case "week":
    case "month":
    case "year":
      return getPeriodRange(preset, from)
    // Janelas móveis: as datas exatas.
    default:
      return { preset, from: startOfDay(from), to: endOfDay(to) }
  }
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
