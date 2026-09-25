import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from "date-fns"

import { formatDate, formatMonthYear } from "@/lib/format"

export type AccountStatus = "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "PAID"

export interface AccountLike {
  dueDate: Date
  paidAt: Date | null
  amount: number
  contactName: string
  description: string
}

export type PeriodPreset =
  | "today"
  | "week"
  | "month"
  | "year"
  | "last30"
  | "last12months"
  | "all"
  | "custom"

export interface PeriodRange {
  preset: PeriodPreset
  from: Date | null
  to: Date | null
}

export function getPeriodRange(
  preset: PeriodPreset,
  reference: Date,
  custom?: { from: Date; to: Date },
): PeriodRange {
  switch (preset) {
    case "today":
      return { preset, from: startOfDay(reference), to: endOfDay(reference) }
    case "week":
      return {
        preset,
        from: startOfWeek(reference, { weekStartsOn: 0 }),
        to: endOfWeek(reference, { weekStartsOn: 0 }),
      }
    case "month":
      return { preset, from: startOfMonth(reference), to: endOfMonth(reference) }
    case "year":
      return { preset, from: startOfYear(reference), to: endOfYear(reference) }
    case "last30":
      return { preset, from: startOfDay(subDays(reference, 29)), to: endOfDay(reference) }
    case "last12months":
      return { preset, from: startOfDay(subMonths(reference, 12)), to: endOfDay(reference) }
    case "all":
      return { preset, from: null, to: null }
    case "custom":
      return {
        preset,
        from: custom ? startOfDay(custom.from) : null,
        to: custom ? endOfDay(custom.to) : null,
      }
  }
}

export function canShiftPeriod(preset: PeriodPreset): boolean {
  return preset !== "all" && preset !== "custom"
}

export function shiftPeriod(range: PeriodRange, direction: 1 | -1): PeriodRange {
  if (!canShiftPeriod(range.preset) || !range.from || !range.to) return range
  switch (range.preset) {
    case "today":
      return getPeriodRange("today", addDays(range.from, direction))
    case "week":
      return getPeriodRange("week", addWeeks(range.from, direction))
    case "month":
      return getPeriodRange("month", addMonths(range.from, direction))
    case "year":
      return getPeriodRange("year", addYears(range.from, direction))
    case "last30": {
      const spanDays = differenceInCalendarDays(range.to, range.from) + 1
      return {
        preset: "last30",
        from: addDays(range.from, direction * spanDays),
        to: addDays(range.to, direction * spanDays),
      }
    }
    case "last12months":
      return {
        preset: "last12months",
        from: addMonths(range.from, direction * 12),
        to: addMonths(range.to, direction * 12),
      }
    default:
      return range
  }
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function periodLabel(range: PeriodRange, today: Date = new Date()): string {
  if (range.preset === "all" || !range.from || !range.to) return "Todo o período"
  switch (range.preset) {
    case "today":
      return isSameDay(range.from, today) ? "Hoje" : formatDate(range.from)
    case "week":
      return isSameWeek(range.from, today, { weekStartsOn: 0 })
        ? "Esta semana"
        : `${format(range.from, "dd/MM")} – ${format(range.to, "dd/MM")}`
    case "month":
      return isSameMonth(range.from, today) ? "Este mês" : capitalize(formatMonthYear(range.from))
    case "year":
      return isSameYear(range.from, today) ? "Este ano" : format(range.from, "yyyy")
    case "last30":
      return isSameDay(range.to, today) ? "Últimos 30 dias" : `${formatDate(range.from)} – ${formatDate(range.to)}`
    case "last12months":
      return isSameDay(range.to, today)
        ? "Últimos 12 meses"
        : `${formatDate(range.from)} – ${formatDate(range.to)}`
    case "custom":
      return `${formatDate(range.from)} – ${formatDate(range.to)}`
    default:
      return "Todo o período"
  }
}

export function deriveStatus(entry: Pick<AccountLike, "dueDate" | "paidAt">, today: Date): AccountStatus {
  if (entry.paidAt) return "PAID"
  const due = startOfDay(entry.dueDate).getTime()
  const ref = startOfDay(today).getTime()
  if (due < ref) return "OVERDUE"
  if (due === ref) return "DUE_TODAY"
  return "UPCOMING"
}

export function filterByPeriod<T extends { dueDate: Date }>(entries: T[], range: PeriodRange): T[] {
  if (!range.from || !range.to) return entries
  const from = range.from.getTime()
  const to = range.to.getTime()
  return entries.filter((entry) => {
    const time = entry.dueDate.getTime()
    return time >= from && time <= to
  })
}

export function filterBySearch<T extends { contactName: string; description: string }>(
  entries: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return entries
  return entries.filter(
    (entry) =>
      entry.contactName.toLowerCase().includes(normalized) ||
      entry.description.toLowerCase().includes(normalized),
  )
}

export type FilterChipKey = "contact" | "category" | "paymentMethod" | "bankAccount"

export type FilterChips = Partial<Record<FilterChipKey, string[]>>

interface ChippableEntry {
  // "contact" here means Favorecido (RN-04's repasse beneficiary) — a sale
  // can pay out to more than one, so this is a list, unlike the other
  // single-valued chip fields.
  beneficiaryNames: string[]
  categoryName: string
  paymentMethod: string
  bankAccountName: string
}

function chipValues(entry: ChippableEntry, key: FilterChipKey): string[] {
  switch (key) {
    case "contact":
      return entry.beneficiaryNames
    case "category":
      return [entry.categoryName]
    case "paymentMethod":
      return [entry.paymentMethod]
    case "bankAccount":
      return [entry.bankAccountName]
  }
}

export function applyChips<T extends ChippableEntry>(entries: T[], chips: FilterChips): T[] {
  const activeKeys = (Object.keys(chips) as FilterChipKey[]).filter((key) => (chips[key]?.length ?? 0) > 0)
  if (activeKeys.length === 0) return entries
  return entries.filter((entry) =>
    activeKeys.every((key) => chipValues(entry, key).some((value) => chips[key]!.includes(value))),
  )
}

export function distinctChipValues<T extends ChippableEntry>(entries: T[], key: FilterChipKey): string[] {
  const values = new Set(entries.flatMap((entry) => chipValues(entry, key)))
  return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

export function filterByStatus<T extends { dueDate: Date; paidAt: Date | null }>(
  entries: T[],
  status: AccountStatus | null,
  today: Date,
): T[] {
  if (!status) return entries
  return entries.filter((entry) => deriveStatus(entry, today) === status)
}

export type SortField = "dueDate" | "description" | "amount"
export type SortDirection = "asc" | "desc"

export interface SortState {
  field: SortField
  direction: SortDirection
}

export function sortEntries<T extends { dueDate: Date; description: string; amount: number }>(
  entries: T[],
  sort: SortState,
): T[] {
  const sorted = [...entries].sort((a, b) => {
    let comparison = 0
    if (sort.field === "dueDate") comparison = a.dueDate.getTime() - b.dueDate.getTime()
    else if (sort.field === "description") comparison = a.description.localeCompare(b.description, "pt-BR")
    else comparison = a.amount - b.amount
    return sort.direction === "asc" ? comparison : -comparison
  })
  return sorted
}

export interface StatusSummary {
  count: number
  total: number
}

export interface AccountsSummary {
  overdue: StatusSummary
  dueToday: StatusSummary
  upcoming: StatusSummary
  paid: StatusSummary
  total: StatusSummary
}

export function computeSummary<T extends { dueDate: Date; paidAt: Date | null; amount: number }>(
  entries: T[],
  today: Date,
): AccountsSummary {
  const summary: AccountsSummary = {
    overdue: { count: 0, total: 0 },
    dueToday: { count: 0, total: 0 },
    upcoming: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    total: { count: entries.length, total: 0 },
  }
  for (const entry of entries) {
    const status = deriveStatus(entry, today)
    const key =
      status === "OVERDUE" ? "overdue" : status === "DUE_TODAY" ? "dueToday" : status === "UPCOMING" ? "upcoming" : "paid"
    summary[key].count += 1
    summary[key].total += entry.amount
    summary.total.total += entry.amount
  }
  return summary
}

export function paginate<T>(entries: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return entries.slice(start, start + pageSize)
}

export function totalPages(count: number, pageSize: number): number {
  return Math.max(1, Math.ceil(count / pageSize))
}

export type PageItem = number | "ellipsis"

export function buildPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
  const items: PageItem[] = [1]
  const start = Math.max(2, current - 2)
  const end = Math.min(total - 1, current + 2)
  if (start > 2) items.push("ellipsis")
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < total - 1) items.push("ellipsis")
  items.push(total)
  return items
}

export interface ApplyAccountsFiltersParams {
  period: PeriodRange
  search: string
  chips: FilterChips
  status: AccountStatus | null
  sort: SortState
  today: Date
}

export function applyAccountsFilters<
  T extends ChippableEntry & {
    dueDate: Date
    paidAt: Date | null
    amount: number
    description: string
    contactName: string
  },
>(
  entries: T[],
  params: ApplyAccountsFiltersParams,
): { entries: T[]; summary: AccountsSummary } {
  const byPeriod = filterByPeriod(entries, params.period)
  const bySearch = filterBySearch(byPeriod, params.search)
  const byChips = applyChips(bySearch, params.chips)
  const summary = computeSummary(byChips, params.today)
  const byStatus = filterByStatus(byChips, params.status, params.today)
  const sorted = sortEntries(byStatus, params.sort)
  return { entries: sorted, summary }
}
