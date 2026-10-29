"use client"

import * as React from "react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, SearchIcon, XIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import {
  createAndSettlePayableAction,
  createAndSettleReceivableAction,
  createSettlementBatchAction,
  searchCandidateEntriesAction,
} from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { ReconciliationCategoryPicker, ReconciliationContactPicker } from "@/components/reconciliation/entry-pickers"
import { CurrencyInput } from "@/components/sales/currency-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatBRL, formatDate } from "@/lib/format"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import { netSettledAmount } from "@/modules/settlements/domain"
import type { CandidateEntry } from "@/modules/settlements/types"
import { cn } from "@/lib/utils"

// `amount` é quanto do valor original do lançamento esta conciliação quita;
// juros, multa e desconto (RN-03) fecham a diferença com a transação.
interface SelectedCandidate {
  entry: CandidateEntry
  amount: number
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

function MoneyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (cents: number) => void
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <CurrencyInput valueInCents={value} onValueChange={onChange} />
    </label>
  )
}

/** Default due-date filter of the search tab: the last 7 days, today included. */
function lastSevenDays(): DateRange {
  const today = new Date()
  return { from: subDays(today, 6), to: today }
}

function formatRange(range: DateRange | undefined): string {
  if (!range?.from) return "Todas as datas"
  if (!range.to || range.to.getTime() === range.from.getTime()) return formatDate(range.from)
  return `${formatDate(range.from)} – ${formatDate(range.to)}`
}

const toIsoDay = (date: Date) => format(date, "yyyy-MM-dd")

const openAmount = (entry: CandidateEntry) => entry.amount - (entry.settledAmount ?? 0)

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
  bankAccountId: string
  contacts: Contact[]
  categories: Category[]
  onContactCreated: (contact: Contact) => void
  onCategoryCreated: (category: Category) => void
}) {
  const [tab, setTab] = React.useState<"buscar" | "criar">("buscar")
  const [query, setQuery] = React.useState("")
  const [dueRange, setDueRange] = React.useState<DateRange | undefined>(lastSevenDays)
  // Centavos; 0 means no bound.
  const [minAmount, setMinAmount] = React.useState(0)
  const [maxAmount, setMaxAmount] = React.useState(0)
  const [results, setResults] = React.useState<CandidateEntry[]>([])
  const [selected, setSelected] = React.useState<Record<string, SelectedCandidate>>({})
  const [reviewing, setReviewing] = React.useState(false)
  const [items, setItems] = React.useState<NewItem[]>([
    { contactId: "", categoryId: "", description: "", amount: Math.abs(transactionAmount) },
  ])
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const absTransactionAmount = Math.abs(transactionAmount)

  const dueFrom = dueRange?.from
  const dueTo = dueRange?.to

  React.useEffect(() => {
    let ignore = false
    searchCandidateEntriesAction({
      type: direction,
      query: query.trim() || undefined,
      dueFrom: dueFrom ? toIsoDay(dueFrom) : undefined,
      // A range still being picked (only `from`) filters that single day.
      dueTo: dueFrom ? toIsoDay(dueTo ?? dueFrom) : undefined,
      minAmount: minAmount > 0 ? minAmount : undefined,
      maxAmount: maxAmount > 0 ? maxAmount : undefined,
    }).then((response) => {
      if (ignore) return
      if (response.ok) setResults(response.data)
    })
    return () => {
      ignore = true
    }
  }, [open, direction, query, dueFrom, dueTo, minAmount, maxAmount])

  function toggleCandidate(entry: CandidateEntry) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[entry.id]) {
        delete next[entry.id]
      } else {
        next[entry.id] = { entry, amount: openAmount(entry), interest: 0, fine: 0, discount: 0 }
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

  // Open balance equal to the bank transaction — the likeliest match — goes
  // first; sort is stable, so the server's order holds within each group.
  const sortedResults = React.useMemo(
    () =>
      [...results].sort(
        (a, b) =>
          Number(openAmount(b) === absTransactionAmount) - Number(openAmount(a) === absTransactionAmount),
      ),
    [results, absTransactionAmount],
  )

  const selectedList = Object.values(selected)
  const sumSelected = selectedList.reduce((sum, s) => sum + netSettledAmount({ settledAmount: s.amount, ...s }), 0)
  const diffSelected = absTransactionAmount - sumSelected
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Vincular transação — {formatBRL(absTransactionAmount)}</DialogTitle>
        </DialogHeader>

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

        {tab === "buscar" ? (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por contato ou descrição..."
                className="pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger
                  render={<Button variant="outline" className="justify-start font-normal" />}
                >
                  <CalendarIcon />
                  {formatRange(dueRange)}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="range" selected={dueRange} onSelect={setDueRange} locale={ptBR} />
                  {dueRange?.from && (
                    <div className="border-t p-2">
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => setDueRange(undefined)}>
                        Todas as datas
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <CurrencyInput
                placeholder="mín."
                className="w-36"
                valueInCents={minAmount}
                onValueChange={setMinAmount}
              />
              <span className="text-xs text-muted-foreground">até</span>
              <CurrencyInput
                placeholder="máx."
                className="w-36"
                valueInCents={maxAmount}
                onValueChange={setMaxAmount}
              />
            </div>

            <div className="min-w-0 rounded-lg border">
              <div className="grid grid-cols-[16px_minmax(0,1fr)_76px_128px] items-center gap-3 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                <span />
                <span>Contato / Descrição</span>
                <span>Venc.</span>
                <span className="text-right">Em aberto</span>
              </div>
              <ScrollArea className="min-w-0 *:data-[slot=scroll-area-viewport]:max-h-80">
                <div className="divide-y">
                  {sortedResults.map((entry) => {
                    const candidate = selected[entry.id]
                    const open = openAmount(entry)
                    return (
                      <div key={entry.id} className={cn("min-w-0", candidate && "bg-primary/5")}>
                        <div className="grid grid-cols-[16px_minmax(0,1fr)_76px_128px] items-center gap-3 px-3 py-2">
                          <Checkbox
                            checked={Boolean(candidate)}
                            onCheckedChange={() => toggleCandidate(entry)}
                            aria-label={`Selecionar ${entry.contactName}`}
                          />
                          <button type="button" className="min-w-0 text-left" onClick={() => toggleCandidate(entry)}>
                            <p className="flex min-w-0 items-center gap-2 text-sm font-medium">
                              <span className="truncate">{entry.contactName}</span>
                              {open === absTransactionAmount && (
                                <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-medium text-emerald-600">
                                  valor exato
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground" title={entry.description}>
                              {entry.description}
                            </p>
                          </button>
                          <span className="text-xs text-muted-foreground tabular-nums">{formatDate(entry.dueDate)}</span>
                          <span className="text-right text-sm font-semibold tabular-nums">{formatBRL(open)}</span>
                        </div>
                        {candidate && showReview && (
                          <div className="flex flex-col gap-2 px-3 pb-3 pl-10">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              <MoneyInput
                                label="Valor original"
                                value={candidate.amount}
                                onChange={(amount) => updateCandidate(entry.id, { amount })}
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
                            <p className="text-right text-xs text-muted-foreground">
                              Total conciliado:{" "}
                              <span className="font-semibold text-foreground">
                                {formatBRL(netSettledAmount({ settledAmount: candidate.amount, ...candidate }))}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {results.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {selectedList.length > 0 && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Soma: <span className="font-semibold text-foreground">{formatBRL(sumSelected)}</span>
                  {diffSelected === 0 ? (
                    <span className="ml-2 text-emerald-600">✓ confere com a transação</span>
                  ) : (
                    <span className="ml-2 text-amber-600">
                      {diffSelected > 0 ? "faltam" : "sobram"} {formatBRL(Math.abs(diffSelected))}
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Único lugar para mudar o valor: parcial, juros, multa ou desconto (RN-03). */}
                  <Button size="sm" variant="outline" onClick={() => setReviewing((prev) => !prev)}>
                    {showReview ? "Ocultar revisão" : "Revisar valores"}
                  </Button>
                  <Button size="sm" onClick={confirmSearch} disabled={pending}>
                    Vincular e conciliar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-3">
            {/* Max height on the viewport (not the root) so the list only scrolls once it outgrows it. */}
            <ScrollArea className="min-w-0 *:data-[slot=scroll-area-viewport]:max-h-96">
              <div className="flex min-w-0 flex-col gap-3 pr-3">
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

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                Soma: <span className="font-semibold text-foreground">{formatBRL(sumItems)}</span>
                {diffItems === 0 ? (
                  <span className="ml-2 text-emerald-600">✓ confere com a transação</span>
                ) : (
                  <span className="ml-2 text-amber-600">diferença de {formatBRL(Math.abs(diffItems))}</span>
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
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  )
}
