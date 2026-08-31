export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
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
