"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  FilterIcon,
  RepeatIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import { AccountEntryDialog } from "@/components/accounts/account-entry-dialog"
import { EntryDetailSheet } from "@/components/accounts/entry-detail-sheet"
import { FilterChip } from "@/components/accounts/filter-chip"
import { PeriodFilter } from "@/components/accounts/period-filter"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  applyAccountsFilters,
  buildPageItems,
  deriveStatus,
  distinctChipValues,
  totalPages,
  type AccountStatus,
  type FilterChipKey,
  type FilterChips,
  type PeriodRange,
  type SortDirection,
  type SortField,
} from "@/lib/accounts/filter"
import { kindConfig, statusBadgeStyle, statusLabel } from "@/lib/accounts/labels"
import { chipOrder, encodeChipValues, parseChipsFromParams, parsePeriodFromParams } from "@/lib/accounts/params"
import { categoryColor } from "@/lib/category-color"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BankAccount } from "@/modules/bank-accounts/types"
import type { AccountEntry, LedgerKind } from "@/modules/accounts/types"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

const chipMeta: Record<FilterChipKey, { label: string }> = {
  contact: { label: "Favorecido" },
  category: { label: "Categoria" },
  paymentMethod: { label: "Forma de pagamento" },
  bankAccount: { label: "Conta" },
}

const summaryDotColor: Record<"overdue" | "dueToday" | "upcoming" | "paid" | "total", string> = {
  overdue: "oklch(0.55 0.22 25)",
  dueToday: "oklch(0.5 0.12 60)",
  upcoming: "oklch(0.556 0 0)",
  paid: "oklch(0.5 0.15 149)",
  total: "oklch(0.145 0 0)",
}

const summaryValueClass: Record<"overdue" | "dueToday" | "upcoming" | "paid" | "total", string> = {
  overdue: "text-[oklch(0.55_0.22_25)]",
  dueToday: "",
  upcoming: "",
  paid: "text-[oklch(0.5_0.15_149)]",
  total: "",
}

type SummaryKey = "overdue" | "dueToday" | "upcoming" | "paid" | "total"

const summaryStatusMap: Record<Exclude<SummaryKey, "total">, AccountStatus> = {
  overdue: "OVERDUE",
  dueToday: "DUE_TODAY",
  upcoming: "UPCOMING",
  paid: "PAID",
}

export function AccountsView({
  kind,
  entries,
  beneficiaries,
  contacts,
  categories,
  bankAccounts,
}: {
  kind: LedgerKind
  entries: AccountEntry[]
  beneficiaries: { id: string; name: string }[]
  contacts: Contact[]
  categories: Category[]
  bankAccounts: BankAccount[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const today = React.useMemo(() => new Date(), [])
  const config = kindConfig[kind]
  const [detailEntryId, setDetailEntryId] = React.useState<string | null>(null)
  const [editingEntry, setEditingEntry] = React.useState<AccountEntry | null>(null)

  const kindEntries = React.useMemo(() => entries.filter((entry) => entry.kind === kind), [entries, kind])

  // Derived (not stored) so the Sheet always shows the freshest copy of the
  // same id after router.refresh() following an edit/delete/undo, instead of
  // a stale snapshot from when it was opened.
  const detailEntry = React.useMemo(
    () => (detailEntryId ? (entries.find((entry) => entry.id === detailEntryId) ?? null) : null),
    [entries, detailEntryId],
  )

  const period = React.useMemo(() => parsePeriodFromParams(searchParams, today), [searchParams, today])
  const search = searchParams.get("q") ?? ""
  const chips = React.useMemo(() => parseChipsFromParams(searchParams), [searchParams])
  const status = (searchParams.get("card") as AccountStatus | null) || null
  const sortField = (searchParams.get("sort") as SortField | null) || "dueDate"
  const sortDirection = (searchParams.get("dir") as SortDirection | null) || "asc"
  const page = Number(searchParams.get("page") ?? "1") || 1
  const pageSize = Number(searchParams.get("size") ?? "10") || 10

  const [openChipKey, setOpenChipKey] = React.useState<FilterChipKey | null>(null)
  const [goToPageInput, setGoToPageInput] = React.useState("")

  function updateParams(patch: Record<string, string | null>, options: { resetPage?: boolean } = {}) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    if (options.resetPage !== false && !("page" in patch)) {
      params.delete("page")
    }
    // Filtering, sorting and paging all run client-side over `entries`, so the
    // server has nothing new to render — the native History API updates the
    // URL (and useSearchParams) without a server round-trip.
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`)
  }

  function handlePeriodChange(range: PeriodRange) {
    if (range.preset === "custom" && range.from && range.to) {
      updateParams({
        period: "custom",
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      })
    } else {
      updateParams({ period: range.preset, from: null, to: null })
    }
  }

  function handleSearchChange(value: string) {
    updateParams({ q: value || null })
  }

  function setChips(next: FilterChips) {
    const patch: Record<string, string | null> = {}
    for (const key of chipOrder) {
      const values = next[key]
      patch[`f_${key}`] = values ? encodeChipValues(values) : null
    }
    updateParams(patch)
  }

  function addChip(key: FilterChipKey) {
    if (!(key in chips)) {
      setChips({ ...chips, [key]: [] })
    }
    setOpenChipKey(key)
  }

  function applyChipValues(key: FilterChipKey, values: string[]) {
    if (values.length === 0) {
      const next = { ...chips }
      delete next[key]
      setChips(next)
      return
    }
    setChips({ ...chips, [key]: values })
  }

  function removeChip(key: FilterChipKey) {
    const next = { ...chips }
    delete next[key]
    setChips(next)
    if (openChipKey === key) setOpenChipKey(null)
  }

  function clearFilters() {
    const patch: Record<string, string | null> = { q: null }
    for (const key of chipOrder) patch[`f_${key}`] = null
    updateParams(patch)
  }

  function toggleStatus(key: Exclude<SummaryKey, "total">) {
    const nextStatus = summaryStatusMap[key]
    updateParams({ card: status === nextStatus ? null : nextStatus })
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      updateParams({ dir: sortDirection === "asc" ? "desc" : "asc" }, { resetPage: false })
    } else {
      updateParams({ sort: field, dir: "asc" }, { resetPage: false })
    }
  }

  function setPage(nextPage: number) {
    updateParams({ page: String(nextPage) }, { resetPage: false })
  }

  function setPageSize(nextSize: string) {
    updateParams({ size: nextSize })
  }

  const { entries: filteredEntries, summary } = React.useMemo(
    () =>
      applyAccountsFilters(kindEntries, {
        period,
        search,
        chips,
        status,
        sort: { field: sortField, direction: sortDirection },
        today,
      }),
    [kindEntries, period, search, chips, status, sortField, sortDirection, today],
  )

  const pages = totalPages(filteredEntries.length, pageSize)
  const currentPage = Math.max(1, Math.min(page, pages))
  const pageStart = filteredEntries.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, filteredEntries.length)
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const chipOptions = React.useMemo(() => {
    const options: Record<FilterChipKey, string[]> = {
      // The full universe of Favorecido contacts registered in the org —
      // not just the ones already used in a visible entry.
      contact: beneficiaries.map((beneficiary) => beneficiary.name),
      category: distinctChipValues(kindEntries, "category"),
      paymentMethod: distinctChipValues(kindEntries, "paymentMethod"),
      bankAccount: distinctChipValues(kindEntries, "bankAccount"),
    }
    return options
  }, [kindEntries, beneficiaries])

  const activeChipKeys = chipOrder.filter((key) => key in chips)

  const periodRangeLabel =
    period.from && period.to ? `${formatDate(period.from)} – ${formatDate(period.to)}` : "Todo o período"

  function sortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDownIcon className="size-3.5 text-muted-foreground" />
    return sortDirection === "asc" ? (
      <ArrowUpIcon className="size-3.5" />
    ) : (
      <ArrowDownIcon className="size-3.5" />
    )
  }

  function handleGoToPage() {
    const parsed = Number(goToPageInput)
    if (!Number.isFinite(parsed) || parsed < 1) return
    setPage(Math.min(Math.round(parsed), pages))
    setGoToPageInput("")
  }

  const summaryCells: { key: SummaryKey; label: string }[] = [
    { key: "overdue", label: "Vencidos" },
    { key: "dueToday", label: "Vencem hoje" },
    { key: "upcoming", label: "A vencer" },
    { key: "paid", label: config.summaryPaidLabel },
    { key: "total", label: "Total do período" },
  ]

  const pageItems = buildPageItems(currentPage, pages)

  return (
    <div className="mx-auto flex w-full max-w-290 flex-col gap-5 px-6 pt-7">
      <div className="flex flex-wrap items-end gap-2.5">
        <PeriodFilter value={period} onChange={handlePeriodChange} today={today} />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-transparent select-none">Busca</span>
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou descrição..."
              className="h-8.5 w-65 pl-8"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" className="h-8.5" />}>
            <FilterIcon />
            Mais filtros
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {chipOrder.map((key) => (
              <DropdownMenuItem key={key} onClick={() => addChip(key)}>
                {chipMeta[key].label}
                {(chips[key]?.length ?? 0) > 0 && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          className="ml-auto h-8.5"
          nativeButton={false}
          // No prefetch: the href changes with every filter, and each prefetch
          // would server-render the whole report just in case it gets opened.
          render={<Link href={`/reports/accounts?kind=${kind}&${searchParams.toString()}`} target="_blank" prefetch={false} />}
        >
          <DownloadIcon />
          Exportar
        </Button>
      </div>

      {activeChipKeys.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Mais filtros selecionados</span>
          <div className="flex flex-wrap items-center gap-2">
            {activeChipKeys.map((key) => (
              <FilterChip
                key={key}
                label={chipMeta[key].label}
                options={chipOptions[key]}
                selected={chips[key] ?? []}
                open={openChipKey === key}
                onOpenChange={(open) => setOpenChipKey(open ? key : null)}
                onApply={(values) => applyChipValues(key, values)}
                onRemove={() => removeChip(key)}
                allowSelectAll={key === "contact"}
              />
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Trash2Icon className="size-3.5" />
              Limpar filtros
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {summaryCells.map((cell) => {
          const isTotal = cell.key === "total"
          const isActive = isTotal
            ? status === null
            : status === summaryStatusMap[cell.key as Exclude<SummaryKey, "total">]
          const data = summary[cell.key]
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => (isTotal ? updateParams({ card: null }) : toggleStatus(cell.key as Exclude<SummaryKey, "total">))}
              className={cn(
                "flex min-w-37.5 flex-1 flex-col gap-1 rounded-lg px-3 py-2 text-left transition-all",
                isActive ? "bg-card shadow-sm ring-1 ring-border" : "hover:bg-card/50",
              )}
            >
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: summaryDotColor[cell.key] }}
                  />
                  {cell.label}
                </span>
                <span>{data.count}</span>
              </span>
              <span className={cn("text-lg font-semibold", summaryValueClass[cell.key])}>
                {formatBRL(data.total)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[12.5px] text-muted-foreground">{filteredEntries.length} lançamentos</p>

        <div className="rounded-xl border">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="h-10 border-b text-xs text-muted-foreground">
                <th className="w-26 px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("dueDate")}
                    className={cn(
                      "flex items-center gap-1",
                      sortField === "dueDate" && "font-semibold text-foreground",
                    )}
                  >
                    Vencimento
                    {sortIcon("dueDate")}
                  </button>
                </th>
                <th className="w-26 px-3 text-left font-medium">{config.paymentColumnLabel}</th>
                <th className="px-3 text-left font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("description")}
                    className={cn(
                      "flex items-center gap-1",
                      sortField === "description" && "font-semibold text-foreground",
                    )}
                  >
                    Resumo do lançamento
                    {sortIcon("description")}
                  </button>
                </th>
                <th className="w-29 px-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("amount")}
                    className={cn(
                      "ml-auto flex items-center gap-1",
                      sortField === "amount" && "font-semibold text-foreground",
                    )}
                  >
                    Total
                    {sortIcon("amount")}
                  </button>
                </th>
                <th className="w-29 px-3 text-right font-medium">{config.amountColumnLabel}</th>
                <th className="w-30 px-3 text-left font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                    Nenhum lançamento neste filtro.
                  </td>
                </tr>
              ) : (
                pageEntries.map((entry) => {
                  const entryStatus = deriveStatus(entry, today)
                  const title = entry.installment ? `${entry.installment} - ${entry.description}` : entry.description
                  return (
                    <tr
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailEntryId(entry.id)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return
                        event.preventDefault()
                        setDetailEntryId(entry.id)
                      }}
                      className="min-h-15 cursor-pointer border-b text-[13px] hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                    >
                      <td className="px-3 py-3 tabular-nums">{formatDate(entry.dueDate)}</td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {entry.paidAt ? formatDate(entry.paidAt) : config.emptyPaymentDate}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-0 items-center gap-1.5">
                          {entry.contract?.modality === "RECURRING" && (
                            <Tooltip>
                              <TooltipTrigger render={<span className="shrink-0" />}>
                                <RepeatIcon className="size-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>Recorrente</TooltipContent>
                            </Tooltip>
                          )}
                          <p className="truncate font-medium">{title}</p>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-1.75 shrink-0 rounded-full"
                              style={{ backgroundColor: categoryColor(entry.categoryId) }}
                            />
                            {entry.categoryName}
                          </span>
                          <span className="truncate">{entry.contactName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{formatBRL(entry.amount)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums">
                        {formatBRL(Math.max(0, entry.amount - entry.settledAmount))}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className="inline-flex h-5.5 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground"
                          style={statusBadgeStyle[entryStatus]}
                        >
                          {statusLabel(entryStatus, kind)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-3.5">
          <div>
            <p className="text-sm font-semibold">Totais do período</p>
            <p className="text-xs text-muted-foreground">{periodRangeLabel}</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{formatBRL(summary.total.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{config.summaryPaidLabel}</p>
              <p className="font-semibold">{formatBRL(summary.paid.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Em aberto</p>
              <p className="font-semibold">
                {formatBRL(summary.overdue.total + summary.dueToday.total + summary.upcoming.total)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Select value={String(pageSize)} onValueChange={(value) => value && setPageSize(value)}>
              <SelectTrigger className="w-fit">
                <SelectValue>{(value: string) => value}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            Registros por página
          </div>

          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                ‹ Anterior
              </Button>
              {pageItems.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1.5 text-sm text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md text-sm",
                      item === currentPage ? "bg-muted font-medium" : "hover:bg-muted",
                    )}
                  >
                    {item}
                  </button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                Próximo ›
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mostrando {pageStart} – {pageEnd} de {filteredEntries.length} registros
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            Ir para página
            <Input
              type="number"
              min={1}
              max={pages}
              value={goToPageInput}
              onChange={(event) => setGoToPageInput(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleGoToPage()}
              className="w-14"
            />
            <Button variant="outline" size="sm" onClick={handleGoToPage}>
              Ok
            </Button>
          </div>
        </div>
      </div>

      <EntryDetailSheet
        entry={detailEntry}
        kind={kind}
        open={detailEntry !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDetailEntryId(null)}
        onEdit={(entry) => {
          setDetailEntryId(null)
          setEditingEntry(entry)
        }}
      />

      <AccountEntryDialog
        entry={editingEntry}
        kind={kind}
        open={editingEntry !== null}
        onOpenChange={(nextOpen) => !nextOpen && setEditingEntry(null)}
        contacts={contacts}
        categories={categories}
        bankAccounts={bankAccounts}
      />
    </div>
  )
}
