"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CalendarIcon, SearchIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import {
  createAndSettlePayableAction,
  createAndSettleReceivableAction,
  createSettlementBatchAction,
  listCandidateEntriesAction,
} from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { FilterChip } from "@/components/accounts/filter-chip"
import { ReconciliationCategoryPicker, ReconciliationContactPicker } from "@/components/reconciliation/entry-pickers"
import { CurrencyInput } from "@/components/sales/currency-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { categoryColor } from "@/lib/category-color"
import { formatBRL, formatDate } from "@/lib/format"
import {
  allocateTransaction,
  candidatePeriod,
  distinctValues,
  filterCandidates,
  openAmount,
  sortCandidates,
  type CandidatePeriod,
  type CandidatePeriodPreset,
  type CandidateSort,
  type CandidateSortField,
} from "@/lib/reconciliation/candidates"
import { cn } from "@/lib/utils"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import { netSettledAmount } from "@/modules/settlements/domain"
import type { CandidateEntry } from "@/modules/settlements/types"

// O usuário só informa juros, multa e desconto (RN-03); quanto do lançamento
// a transação quita (`amount`) é derivado — ver allocateTransaction.
interface SelectedCandidate {
  entry: CandidateEntry
  interest: number
  fine: number
  discount: number
}

type Adjustment = "interest" | "fine" | "discount"

const adjustmentLabels: Record<Adjustment, string> = {
  interest: "Juros",
  fine: "Multa",
  discount: "Desconto",
}

const periodPresetLabels: Record<Exclude<CandidatePeriodPreset, "custom">, string> = {
  around15: "15 dias antes e depois",
  around30: "30 dias antes e depois",
  transactionMonth: "Mês da transação",
  all: "Todo o período",
}

function MoneyInput({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string
  value: number
  onChange?: (cents: number) => void
  readOnly?: boolean
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <CurrencyInput
        valueInCents={value}
        onValueChange={onChange ?? (() => {})}
        readOnly={readOnly}
        tabIndex={readOnly ? -1 : undefined}
        className={readOnly ? "cursor-default bg-muted/50 font-semibold focus-visible:ring-0" : undefined}
      />
    </label>
  )
}

function periodLabel(period: CandidatePeriod): string {
  if (period.preset !== "custom") return periodPresetLabels[period.preset]
  if (!period.from || !period.to) return "Todo o período"
  if (period.from.getTime() === period.to.getTime()) return formatDate(period.from)
  return `${formatDate(period.from)} – ${formatDate(period.to)}`
}

interface NewItem {
  contactId: string
  categoryId: string
  description: string
  amount: number
}

export function ReconciliationMatchModal({
  open,
  onClose,
  onSettled,
  bankTransactionId,
  direction,
  transactionAmount,
  transactionDate,
  transactionDescription,
  bankAccountId,
  contacts,
  categories,
  onContactCreated,
  onCategoryCreated,
}: {
  open: boolean
  onClose: () => void
  onSettled: () => void
  bankTransactionId: string
  direction: "RECEIVABLE" | "PAYABLE"
  transactionAmount: number
  transactionDate: Date
  transactionDescription: string
  bankAccountId: string
  contacts: Contact[]
  categories: Category[]
  onContactCreated: (contact: Contact) => void
  onCategoryCreated: (category: Category) => void
}) {
  const [tab, setTab] = React.useState<"buscar" | "criar">("buscar")

  // Todos os lançamentos em aberto, carregados uma vez ao abrir; os filtros
  // abaixo rodam no navegador, sem ida ao servidor a cada tecla.
  const [candidates, setCandidates] = React.useState<CandidateEntry[] | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [period, setPeriod] = React.useState<CandidatePeriod>(() => candidatePeriod("around15", transactionDate))
  const [periodOpen, setPeriodOpen] = React.useState(false)
  // Centavos sobre o valor em aberto; 0 = sem limite.
  const [minAmount, setMinAmount] = React.useState(0)
  const [maxAmount, setMaxAmount] = React.useState(0)
  const [contactNames, setContactNames] = React.useState<string[]>([])
  const [categoryNames, setCategoryNames] = React.useState<string[]>([])
  const [openChip, setOpenChip] = React.useState<"contact" | "category" | null>(null)
  const [sort, setSort] = React.useState<CandidateSort>({ field: "relevance", direction: "asc" })

  const [selected, setSelected] = React.useState<Record<string, SelectedCandidate>>({})
  const [reviewing, setReviewing] = React.useState(false)
  const [items, setItems] = React.useState<NewItem[]>([
    { contactId: "", categoryId: "", description: "", amount: Math.abs(transactionAmount) },
  ])
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const absTransactionAmount = Math.abs(transactionAmount)
  const isReceivable = direction === "RECEIVABLE"
  const contactLabel = isReceivable ? "Cliente" : "Fornecedor"

  React.useEffect(() => {
    let ignore = false
    listCandidateEntriesAction({ type: direction, bankAccountId }).then((response) => {
      if (ignore) return
      if (response.ok) setCandidates(response.data)
      else setLoadError(response.error)
    })
    return () => {
      ignore = true
    }
  }, [direction, bankAccountId])

  const allCandidates = React.useMemo(() => candidates ?? [], [candidates])
  const contactOptions = React.useMemo(() => distinctValues(allCandidates, (e) => e.contactName), [allCandidates])
  const categoryOptions = React.useMemo(() => distinctValues(allCandidates, (e) => e.categoryName), [allCandidates])

  const visibleCandidates = React.useMemo(() => {
    const filtered = filterCandidates(allCandidates, { query, period, minAmount, maxAmount, contactNames, categoryNames })
    return sortCandidates(filtered, sort, { amount: transactionAmount, date: transactionDate })
  }, [allCandidates, query, period, minAmount, maxAmount, contactNames, categoryNames, sort, transactionAmount, transactionDate])

  // Ordem de inserção = ordem de seleção, que decide quem fica parcial.
  const selectedList = React.useMemo(() => {
    const list = Object.values(selected)
    const amounts = allocateTransaction(
      transactionAmount,
      list.map((s) => ({ open: openAmount(s.entry), interest: s.interest, fine: s.fine, discount: s.discount })),
    )
    return list.map((s, i) => ({ ...s, amount: amounts[i] }))
  }, [selected, transactionAmount])
  const allocated = new Map(selectedList.map((s) => [s.entry.id, s]))
  // Selecionados que um filtro escondeu continuam à vista, no topo — senão a
  // soma do rodapé contaria linhas que não aparecem.
  const rows = React.useMemo(() => {
    const visibleIds = new Set(visibleCandidates.map((entry) => entry.id))
    const hiddenSelected = selectedList.map((s) => s.entry).filter((entry) => !visibleIds.has(entry.id))
    return [...hiddenSelected, ...visibleCandidates]
  }, [visibleCandidates, selectedList])

  const filtersActive =
    query.trim() !== "" ||
    period.preset !== "around15" ||
    minAmount > 0 ||
    maxAmount > 0 ||
    contactNames.length > 0 ||
    categoryNames.length > 0

  function clearFilters() {
    setQuery("")
    setPeriod(candidatePeriod("around15", transactionDate))
    setMinAmount(0)
    setMaxAmount(0)
    setContactNames([])
    setCategoryNames([])
  }

  function toggleSort(field: Exclude<CandidateSortField, "relevance">) {
    setSort((prev) =>
      prev.field !== field
        ? { field, direction: "asc" }
        : prev.direction === "asc"
          ? { field, direction: "desc" }
          : // Terceiro clique volta à ordem por relevância.
            { field: "relevance", direction: "asc" },
    )
  }

  function sortIcon(field: CandidateSortField) {
    if (sort.field !== field) return <ArrowUpDownIcon className="size-3.5 opacity-60" />
    return sort.direction === "asc" ? <ArrowUpIcon className="size-3.5" /> : <ArrowDownIcon className="size-3.5" />
  }

  function toggleCandidate(entry: CandidateEntry) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[entry.id]) {
        delete next[entry.id]
      } else {
        next[entry.id] = { entry, interest: 0, fine: 0, discount: 0 }
      }
      return next
    })
  }

  function updateCandidate(entryId: string, patch: Partial<Omit<SelectedCandidate, "entry">>) {
    setSelected((prev) => (prev[entryId] ? { ...prev, [entryId]: { ...prev[entryId], ...patch } } : prev))
  }

  function updateItem(index: number, patch: Partial<NewItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const sumSelected = selectedList.reduce((sum, s) => sum + netSettledAmount({ settledAmount: s.amount, ...s }), 0)
  const diffSelected = absTransactionAmount - sumSelected
  // O que os lançamentos selecionados ainda deixam em aberto (recebimento parcial).
  const leftOpen = selectedList.reduce((sum, s) => sum + Math.max(0, openAmount(s.entry) - s.amount), 0)
  // A transação acabou antes de chegar a algum selecionado.
  const uncovered = selectedList.filter((s) => s.amount <= 0)
  const showReview = reviewing && selectedList.length > 0

  async function confirmSearch() {
    if (selectedList.length === 0) return
    setPending(true)
    setError(null)
    const response = await createSettlementBatchAction({
      bankTransactionId,
      items: selectedList.map((s) => ({
        entryId: s.entry.id,
        settledAmount: s.amount,
        interest: s.interest,
        fine: s.fine,
        discount: s.discount,
        settledAt: transactionDate,
      })),
    })
    setPending(false)
    if (!response.ok) {
      setError(response.error)
      return
    }
    onSettled()
    onClose()
  }

  const sumItems = items.reduce((sum, item) => sum + item.amount, 0)
  const diffItems = absTransactionAmount - sumItems

  async function confirmCreate() {
    setPending(true)
    setError(null)
    const action = direction === "PAYABLE" ? createAndSettlePayableAction : createAndSettleReceivableAction
    for (const item of items) {
      const response = await action({
        contactId: item.contactId,
        categoryId: item.categoryId,
        bankAccountId,
        description: item.description,
        bankTransactionId,
        settledAmount: item.amount,
        settledAt: transactionDate,
      })
      if (!response.ok) {
        setPending(false)
        setError(response.error)
        return
      }
    }
    setPending(false)
    onSettled()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[min(88vh,860px)] flex-col gap-0 p-0 sm:max-w-6xl">
        <DialogHeader className="gap-3 border-b p-4 pr-12">
          <DialogTitle>Vincular transação</DialogTitle>
          {/* A transação que está sendo conciliada fica sempre à vista. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted px-3 py-2 text-[13px]">
            <span className="tabular-nums text-muted-foreground">{formatDate(transactionDate)}</span>
            <span className="min-w-0 flex-1 truncate" title={transactionDescription}>
              {transactionDescription}
            </span>
            <span className="text-xs text-muted-foreground">{isReceivable ? "Entrada" : "Saída"}</span>
            <span className={cn("font-semibold tabular-nums", isReceivable ? "text-positive" : "text-negative")}>
              {formatBRL(absTransactionAmount)}
            </span>
          </div>
          <div className="flex w-fit gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab("buscar")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === "buscar" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Buscar existente
            </button>
            <button
              type="button"
              onClick={() => setTab("criar")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === "criar" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Criar lançamento(s)
            </button>
          </div>
        </DialogHeader>

        {tab === "buscar" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder={`Buscar por ${contactLabel.toLowerCase()} ou descrição...`}
                  className="w-72 pl-8"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>

              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger render={<Button variant="outline" className="justify-start font-normal" />}>
                  <CalendarIcon />
                  <span className="text-muted-foreground">Vencimento:</span>
                  {periodLabel(period)}
                </PopoverTrigger>
                <PopoverContent className="flex w-auto flex-row gap-0 p-0" align="start">
                  <div className="flex w-48 flex-col gap-0.5 border-r p-2">
                    {(Object.keys(periodPresetLabels) as (keyof typeof periodPresetLabels)[]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setPeriod(candidatePeriod(preset, transactionDate))
                          setPeriodOpen(false)
                        }}
                        className={cn(
                          "rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                          period.preset === preset && "bg-accent font-medium",
                        )}
                      >
                        {periodPresetLabels[preset]}
                      </button>
                    ))}
                    <p className="mt-auto px-2 pt-2 text-xs text-muted-foreground">
                      Contados a partir de {formatDate(transactionDate)}, a data da transação.
                    </p>
                  </div>
                  <Calendar
                    mode="range"
                    locale={ptBR}
                    defaultMonth={period.from ?? transactionDate}
                    selected={period.from && period.to ? ({ from: period.from, to: period.to } as DateRange) : undefined}
                    onSelect={(range) => {
                      if (!range?.from) return
                      // Um intervalo ainda sendo escolhido (só `from`) filtra aquele dia.
                      setPeriod(candidatePeriod("custom", transactionDate, { from: range.from, to: range.to ?? range.from }))
                    }}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-1.5">
                <CurrencyInput placeholder="Valor mín." className="w-32" valueInCents={minAmount} onValueChange={setMinAmount} />
                <span className="text-xs text-muted-foreground">até</span>
                <CurrencyInput placeholder="Valor máx." className="w-32" valueInCents={maxAmount} onValueChange={setMaxAmount} />
              </div>

              <FilterChip
                label={contactLabel}
                options={contactOptions}
                selected={contactNames}
                open={openChip === "contact"}
                onOpenChange={(next) => setOpenChip(next ? "contact" : null)}
                onApply={setContactNames}
                onRemove={() => setContactNames([])}
              />
              <FilterChip
                label="Categoria"
                options={categoryOptions}
                selected={categoryNames}
                open={openChip === "category"}
                onOpenChange={(next) => setOpenChip(next ? "category" : null)}
                onApply={setCategoryNames}
                onRemove={() => setCategoryNames([])}
              />

              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  Limpar filtros
                </Button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead className="sticky top-0 z-10 bg-popover">
                  <tr className="h-9 border-b text-xs text-muted-foreground">
                    <th className="w-10 pl-4" />
                    <th className="w-26 px-2 text-left font-medium">
                      <button type="button" onClick={() => toggleSort("dueDate")} className="flex items-center gap-1">
                        Vencimento {sortIcon("dueDate")}
                      </button>
                    </th>
                    <th className="px-2 text-left font-medium">
                      <button type="button" onClick={() => toggleSort("contactName")} className="flex items-center gap-1">
                        {contactLabel} / Descrição {sortIcon("contactName")}
                      </button>
                    </th>
                    <th className="w-44 px-2 text-left font-medium">Categoria</th>
                    <th className="w-28 px-2 text-right font-medium">Valor</th>
                    <th className="w-32 pr-4 pl-2 text-right font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("openAmount")}
                        className="ml-auto flex items-center gap-1"
                      >
                        Em aberto {sortIcon("openAmount")}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => {
                    const candidate = allocated.get(entry.id)
                    const open = openAmount(entry)
                    const isPartial = (entry.settledAmount ?? 0) > 0
                    return (
                      <React.Fragment key={entry.id}>
                        <tr
                          onClick={() => toggleCandidate(entry)}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            !(candidate && showReview) && "border-b",
                            candidate && "bg-primary/5 hover:bg-primary/10",
                          )}
                        >
                          <td className="py-2.5 pl-4" onClick={(event) => event.stopPropagation()}>
                            <Checkbox
                              checked={Boolean(candidate)}
                              onCheckedChange={() => toggleCandidate(entry)}
                              aria-label={`Selecionar ${entry.contactName}`}
                            />
                          </td>
                          <td className="px-2 py-2.5 tabular-nums">{formatDate(entry.dueDate)}</td>
                          <td className="max-w-0 px-2 py-2.5">
                            <p className="flex min-w-0 items-center gap-2 font-medium">
                              <span className="truncate" title={entry.contactName}>
                                {entry.contactName}
                              </span>
                              {open === absTransactionAmount && (
                                <span className="shrink-0 rounded-full bg-positive/15 px-1.5 py-0.5 text-[10.5px] font-medium text-positive">
                                  valor exato
                                </span>
                              )}
                              {isPartial && (
                                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                                  parcial
                                </span>
                              )}
                            </p>
                            <p
                              className="truncate text-xs text-muted-foreground"
                              title={entry.installment ? `${entry.installment} - ${entry.description}` : entry.description}
                            >
                              {entry.installment && <span className="tabular-nums">{entry.installment} · </span>}
                              {entry.description}
                            </p>
                          </td>
                          <td className="max-w-0 px-2 py-2.5">
                            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                              {entry.categoryId && (
                                <span
                                  className="size-1.75 shrink-0 rounded-full"
                                  style={{ backgroundColor: categoryColor(entry.categoryId) }}
                                />
                              )}
                              <span className="truncate" title={entry.categoryName}>
                                {entry.categoryName}
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-right text-muted-foreground tabular-nums">
                            {formatBRL(entry.amount)}
                          </td>
                          <td className="py-2.5 pr-4 pl-2 text-right font-semibold tabular-nums">{formatBRL(open)}</td>
                        </tr>
                        {candidate && showReview && (
                          <tr className="border-b bg-primary/5">
                            <td />
                            <td colSpan={5} className="pr-4 pb-3 pl-2">
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <MoneyInput
                                  label={isReceivable ? "Valor recebido" : "Valor pago"}
                                  value={candidate.amount}
                                  readOnly
                                />
                                {(Object.keys(adjustmentLabels) as Adjustment[]).map((key) => (
                                  <MoneyInput
                                    key={key}
                                    label={adjustmentLabels[key]}
                                    value={candidate[key]}
                                    onChange={(cents) => updateCandidate(entry.id, { [key]: cents })}
                                  />
                                ))}
                              </div>
                              <p className="mt-2 text-right text-xs text-muted-foreground">
                                {candidate.amount < open && (
                                  <span className="mr-3 text-warning">
                                    Saldo restante: {formatBRL(open - candidate.amount)}
                                  </span>
                                )}
                                Total conciliado:{" "}
                                <span className="font-semibold text-foreground">
                                  {formatBRL(netSettledAmount({ settledAmount: candidate.amount, ...candidate }))}
                                </span>
                              </p>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              {candidates === null && !loadError && (
                <p className="py-10 text-center text-sm text-muted-foreground">Carregando lançamentos...</p>
              )}
              {loadError && <p className="py-10 text-center text-sm text-destructive">{loadError}</p>}
              {candidates !== null && rows.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <p>Nenhum lançamento em aberto neste filtro.</p>
                  {period.preset !== "all" && (
                    <Button variant="outline" size="sm" onClick={() => setPeriod(candidatePeriod("all", transactionDate))}>
                      Buscar em todo o período
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                {selectedList.length > 0 && (
                  <>
                    {selectedList.length} {selectedList.length === 1 ? "selecionado" : "selecionados"}, soma{" "}
                    <span className="font-semibold text-foreground">{formatBRL(sumSelected)}</span>
                    {diffSelected !== 0 ? (
                      <span className="ml-2 text-warning">
                        {diffSelected > 0
                          ? leftOpen === 0
                            ? `faltam ${formatBRL(diffSelected)} para fechar a transação, lance em juros ou multa`
                            : `faltam ${formatBRL(diffSelected)} para fechar a transação`
                          : `passa ${formatBRL(-diffSelected)} do valor da transação`}
                      </span>
                    ) : (
                      leftOpen === 0 && <span className="ml-2 text-positive">✓ confere com a transação</span>
                    )}
                    {uncovered.length > 0 && (
                      <span className="ml-2 text-destructive">
                        · a transação não cobre {uncovered.length === 1 ? "o último selecionado" : `${uncovered.length} selecionados`}
                      </span>
                    )}
                    {leftOpen > 0 && (
                      <span className="ml-2 text-warning">· Saldo restante: {formatBRL(leftOpen)}</span>
                    )}
                  </>
                )}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {/* Juros, multa e desconto (RN-03); o valor recebido sai do extrato. */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewing((prev) => !prev)}
                  disabled={selectedList.length === 0}
                >
                  {showReview ? "Ocultar revisão" : "Revisar valores"}
                </Button>
                <Button size="sm" onClick={confirmSearch} disabled={pending || selectedList.length === 0 || diffSelected < 0 || uncovered.length > 0}>
                  Conciliar
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Ocupa o espaço que sobra no popup e rola só quando a lista passa dele. */}
            <ScrollArea className="min-h-0 min-w-0 flex-1">
              <div className="flex min-w-0 flex-col gap-3 p-4">
                {items.map((item, index) => (
                  <div key={index} className="flex min-w-0 flex-col gap-2 rounded-lg border bg-muted p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <ReconciliationContactPicker
                          contacts={contacts}
                          direction={direction}
                          value={item.contactId}
                          onValueChange={(contactId) => updateItem(index, { contactId })}
                          onCreated={(contact) => {
                            onContactCreated(contact)
                            updateItem(index, { contactId: contact.id })
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <ReconciliationCategoryPicker
                          categories={categories}
                          direction={direction}
                          value={item.categoryId}
                          onValueChange={(categoryId) => updateItem(index, { categoryId })}
                          onCreated={(category) => {
                            onCategoryCreated(category)
                            updateItem(index, { categoryId: category.id })
                          }}
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <XIcon className="size-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <Input
                        placeholder="Descrição"
                        value={item.description}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                        className="min-w-0 flex-1"
                      />
                      <div className="w-40 shrink-0">
                        <CurrencyInput
                          valueInCents={item.amount}
                          onValueChange={(amount) => updateItem(index, { amount })}
                        />
                      </div>
                      {/* Same width as the remove button above, so the amount lines up with Categoria. */}
                      {items.length > 1 && <span aria-hidden className="size-4 shrink-0" />}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    // The new item starts with whatever is still missing to match the transaction.
                    setItems((prev) => [
                      ...prev,
                      { contactId: "", categoryId: "", description: "", amount: Math.max(0, diffItems) },
                    ])
                  }
                  className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground hover:bg-accent"
                >
                  + Adicionar outro lançamento
                </button>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-muted-foreground">
                Soma: <span className="font-semibold text-foreground">{formatBRL(sumItems)}</span>
                {diffItems === 0 ? (
                  <span className="ml-2 text-positive">✓ confere com a transação</span>
                ) : (
                  <span className="ml-2 text-warning">diferença de {formatBRL(Math.abs(diffItems))}</span>
                )}
              </span>
              <Button
                size="sm"
                onClick={confirmCreate}
                disabled={pending || items.some((item) => !item.contactId || !item.categoryId || !item.description)}
              >
                Criar e conciliar
              </Button>
            </div>
          </>
        )}

        {error && <p className="px-4 pb-3 text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
