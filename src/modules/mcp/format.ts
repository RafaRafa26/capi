// How values leave the MCP: money in reais (number, two decimals) and dates
// as YYYY-MM-DD. Pure — no I/O.

/** The database keeps cents (AD-07); Claude reads and sums reais more reliably. */
export function reais(cents: number): number {
  return Math.round(cents) / 100
}

/**
 * Calendar day of a date the services already re-anchored with
 * `fromDbDate` (UTC noon) — reading it in UTC keeps the same day.
 */
export function day(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function optionalDay(date: Date | null | undefined): string | null {
  return date ? day(date) : null
}

/** Local-noon date from businessToday() → its calendar day. */
export function localDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Inclusive day-range check on YYYY-MM-DD strings (they sort lexicographically). */
export function inDayRange(value: string, from?: string, to?: string): boolean {
  return (!from || value >= from) && (!to || value <= to)
}

/** Case- and accent-insensitive "contains". */
export function matchesText(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  return normalize(haystack).includes(normalize(needle))
}
