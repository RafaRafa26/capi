export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/** Short axis label for chart Y ticks: "1,2M", "35k", "800". */
export function formatCompactBRL(cents: number): string {
  const reais = cents / 100
  const abs = Math.abs(reais)
  if (abs >= 1_000_000) return `${(reais / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`
  if (abs >= 1_000) return `${(reais / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
  return reais.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
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

type BankAccountNumbers = { branchNumber: string; accountNumber: string }

/** "Ag 0001 / CC 12345-6" — agência e conta são opcionais, e o que estiver vazio sai do texto. */
export function formatBankAccountNumbers({ branchNumber, accountNumber }: BankAccountNumbers): string {
  return [branchNumber && `Ag ${branchNumber}`, accountNumber && `CC ${accountNumber}`].filter(Boolean).join(" / ")
}

/** "Conta PJ — Ag 0001 / CC 12345-6", ou só o nome quando a conta não tem agência nem número. */
export function formatBankAccountLabel(account: BankAccountNumbers & { name: string }): string {
  return [account.name, formatBankAccountNumbers(account)].filter(Boolean).join(" — ")
}
