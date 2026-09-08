export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/** Parses a "1.234,56"-style BRL input into integer cents. */
export function parseBRLInput(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, "").replace(",", ".")
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0
}

/** Formats integer cents back into a "1.234,56"-style editable input value. */
export function formatBRLInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(date: Date | string | number) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatDayMonth(date: Date | string | number) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatMonthYear(date: Date | string | number) {
  return new Date(date).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  })
}

export function formatMonthShort(date: Date | string | number) {
  return new Date(date).toLocaleDateString("pt-BR", { month: "short" })
}

export function formatMonthYearShort(date: Date | string | number) {
  return new Date(date).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  })
}
