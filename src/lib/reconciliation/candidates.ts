// Filtro e ordenação da aba "Buscar existente" do popup de conciliação. A
// lista inteira de lançamentos em aberto chega uma vez do servidor e tudo
// aqui roda no navegador, a cada tecla — por isso é puro e sem I/O.
import { addDays, differenceInCalendarDays, endOfMonth, startOfDay, startOfMonth, subDays } from "date-fns"

export interface CandidateLike {
  contactName: string
  description: string
  categoryName: string
  dueDate: Date
  amount: number
  settledAmount: number | null
}

/** O que ainda falta quitar no lançamento — é isso que a transação pode cobrir. */
export function openAmount(entry: Pick<CandidateLike, "amount" | "settledAmount">): number {
  return entry.amount - (entry.settledAmount ?? 0)
}

export type CandidatePeriodPreset = "around15" | "around30" | "transactionMonth" | "all" | "custom"

export interface CandidatePeriod {
  preset: CandidatePeriodPreset
  from: Date | null
  to: Date | null
}

/** Períodos contados a partir da data da transação bancária, não de hoje. */
export function candidatePeriod(
  preset: CandidatePeriodPreset,
  transactionDate: Date,
  custom?: { from: Date; to: Date },
): CandidatePeriod {
  const day = startOfDay(transactionDate)
  switch (preset) {
    case "around15":
      return { preset, from: subDays(day, 15), to: addDays(day, 15) }
    case "around30":
      return { preset, from: subDays(day, 30), to: addDays(day, 30) }
    case "transactionMonth":
      return { preset, from: startOfMonth(day), to: startOfDay(endOfMonth(day)) }
    case "all":
      return { preset, from: null, to: null }
    case "custom":
      return { preset, from: custom ? startOfDay(custom.from) : null, to: custom ? startOfDay(custom.to) : null }
  }
}

export interface CandidateFilters {
  query: string
  period: CandidatePeriod
  // Centavos, sobre o valor em aberto; 0 = sem limite.
  minAmount: number
  maxAmount: number
  // Vazios = todos.
  contactNames: string[]
  categoryNames: string[]
}

/** Minúsculas e sem acento — "joao" acha "João". */
function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
}

export function filterCandidates<T extends CandidateLike>(entries: T[], filters: CandidateFilters): T[] {
  const query = normalize(filters.query.trim())
  const contacts = new Set(filters.contactNames)
  const categories = new Set(filters.categoryNames)
  const { from, to } = filters.period

  return entries.filter((entry) => {
    if (query && !normalize(entry.contactName).includes(query) && !normalize(entry.description).includes(query)) {
      return false
    }
    const due = startOfDay(entry.dueDate)
    if (from && due < from) return false
    if (to && due > to) return false
    const open = openAmount(entry)
    if (filters.minAmount > 0 && open < filters.minAmount) return false
    if (filters.maxAmount > 0 && open > filters.maxAmount) return false
    if (contacts.size > 0 && !contacts.has(entry.contactName)) return false
    if (categories.size > 0 && !categories.has(entry.categoryName)) return false
    return true
  })
}

export type CandidateSortField = "relevance" | "dueDate" | "contactName" | "openAmount"
export interface CandidateSort {
  field: CandidateSortField
  direction: "asc" | "desc"
}

/**
 * "relevance" (o padrão) põe primeiro quem tem o valor em aberto igual ao da
 * transação e, depois, o vencimento mais perto da data dela — os prováveis
 * no topo. As outras são a ordenação comum da coluna.
 */
export function sortCandidates<T extends CandidateLike>(
  entries: T[],
  sort: CandidateSort,
  transaction: { amount: number; date: Date },
): T[] {
  const target = Math.abs(transaction.amount)
  const distance = (entry: T) => Math.abs(differenceInCalendarDays(entry.dueDate, transaction.date))

  return [...entries].sort((a, b) => {
    let comparison: number
    switch (sort.field) {
      case "relevance":
        comparison =
          Number(openAmount(b) === target) - Number(openAmount(a) === target) ||
          distance(a) - distance(b) ||
          a.dueDate.getTime() - b.dueDate.getTime()
        return comparison
      case "dueDate":
        comparison = a.dueDate.getTime() - b.dueDate.getTime()
        break
      case "contactName":
        comparison = a.contactName.localeCompare(b.contactName, "pt-BR")
        break
      case "openAmount":
        comparison = openAmount(a) - openAmount(b)
        break
    }
    return sort.direction === "asc" ? comparison : -comparison
  })
}

/** Valores distintos de um campo, em ordem alfabética — as opções dos filtros de contato e categoria. */
export function distinctValues<T>(entries: T[], pick: (entry: T) => string): string[] {
  return [...new Set(entries.map(pick))].sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export interface AllocationItem {
  /** Valor em aberto do lançamento. */
  open: number
  interest: number
  fine: number
  discount: number
}

/**
 * Quanto do valor em aberto de cada lançamento a transação quita — o usuário
 * não digita o valor recebido, só juros, multa e desconto. Na ordem de
 * seleção, cada lançamento leva até o que tem em aberto; o último fica com o
 * resto e pode ser parcial (RN-06). 0 = a transação não chegou até ele.
 *
 * Juros e multa não reduzem o valor recebido: são o que o usuário lança para
 * cobrir o que a transação trouxe a mais. Se passarem da diferença, o total
 * passa da transação e quem chama avisa — o erro é de digitação. O desconto
 * entra na conta: uma transação de 480 com 20 de desconto quita os 500.
 */
export function allocateTransaction(transactionAmount: number, items: AllocationItem[]): number[] {
  let remaining = Math.abs(transactionAmount)
  return items.map((item) => {
    const amount = Math.max(0, Math.min(item.open, remaining + item.discount))
    remaining -= amount + item.interest + item.fine - item.discount
    return amount
  })
}
