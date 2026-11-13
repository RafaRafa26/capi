// O recorte de um mês do extrato da conta bancária — compartilhado entre a
// tela Contas e Extratos e o Exportar (PDF/XLSX), para o arquivo sair igual
// ao que está na tela. Puro e sem I/O.
import type { BankAccount, BankAccountStatementLine } from "@/modules/bank-accounts/types"

/** Os seletores do gráfico: Saldo mostra tudo; Entradas e Saídas filtram o extrato. */
export type StatementSeries = "saldo" | "entradas" | "saidas"

export const STATEMENT_SERIES: StatementSeries[] = ["saldo", "entradas", "saidas"]

export const statementSeriesLabel: Record<StatementSeries, string> = {
  saldo: "Saldo",
  entradas: "Entradas",
  saidas: "Saídas",
}

export function parseStatementSeries(value: string | null): StatementSeries {
  return STATEMENT_SERIES.includes(value as StatementSeries) ? (value as StatementSeries) : "saldo"
}

/** Mês na URL como `yyyy-MM`, pela data local. */
export function toParamMonth(month: Date): string {
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
}

/** O inverso de toParamMonth: dia 1 do mês, à meia-noite local; null se ausente ou inválido. */
export function fromParamMonth(value: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null
  const [year, month] = value.split("-").map(Number)
  if (month < 1 || month > 12) return null
  return new Date(year, month - 1, 1)
}

export interface StatementMonth<T extends BankAccountStatementLine = BankAccountStatementLine> {
  /** Todas as linhas do mês, da mais antiga para a mais nova — o gráfico usa estas. */
  monthLines: T[]
  /** As linhas do mês que o filtro deixa à vista — a tabela e o arquivo usam estas. */
  lines: T[]
  /** Último dia do mês anterior — a data da linha "Saldo anterior". */
  openingDate: Date
  /** Saldo no fim do último dia do mês anterior. */
  openingBalance: number
  /** Saldo depois da última linha do mês (ou o de abertura, se não houve nenhuma). */
  closingBalance: number
  /** Totais do mês inteiro, sem o filtro — são os números dos seletores. */
  entradas: number
  saidas: number
}

/**
 * `lines` chegam em ordem cronológica, com `runningBalance` já acumulado
 * desde o saldo inicial da conta (getBankAccountStatement).
 */
export function statementMonth<T extends BankAccountStatementLine>(
  allLines: T[],
  initialBalance: number,
  month: Date,
  series: StatementSeries,
): StatementMonth<T> {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 1)

  let openingBalance = initialBalance
  const monthLines: T[] = []
  for (const line of allLines) {
    if (line.date < start) openingBalance = line.runningBalance
    else if (line.date < end) monthLines.push(line)
  }

  let entradas = 0
  let saidas = 0
  for (const line of monthLines) {
    if (line.amount > 0) entradas += line.amount
    else saidas += -line.amount
  }

  const lines =
    series === "entradas"
      ? monthLines.filter((line) => line.amount > 0)
      : series === "saidas"
        ? monthLines.filter((line) => line.amount < 0)
        : monthLines

  return {
    monthLines,
    lines,
    openingDate: new Date(month.getFullYear(), month.getMonth(), 0),
    openingBalance,
    closingBalance: monthLines.at(-1)?.runningBalance ?? openingBalance,
    entradas,
    saidas,
  }
}

/**
 * Como uma linha aparece no arquivo exportado: o lançamento (o que a tela
 * mostra), os contatos e, à parte, a descrição original do banco.
 */
export function statementLineText(line: BankAccountStatementLine): {
  title: string
  contacts: string
  bankDescription: string
} {
  return {
    title: line.entries.map((entry) => entry.description).join(" · ") || line.description,
    contacts: [...new Set(line.entries.map((entry) => entry.contactName))].join(", "),
    bankDescription: line.bankTransactionId ? line.description : "",
  }
}

/** `extrato-<conta>-2026-08-entradas.pdf` — sem acento nem espaço. */
export function statementFileName(accountName: string, month: Date, series: StatementSeries, extension: "pdf" | "xlsx") {
  const slug = accountName
    .normalize("NFD")
    .replace(/[^\w]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
  return `extrato-${slug}-${toParamMonth(month)}${series === "saldo" ? "" : `-${series}`}.${extension}`
}

/** O que as rotas de exportação (PDF e XLSX) entregam para quem monta o arquivo. */
export interface BankStatementExport {
  organizationName: string
  organizationDocument: string | null
  bankAccount: BankAccount
  month: Date
  series: StatementSeries
  view: StatementMonth
  generatedAt: Date
}
