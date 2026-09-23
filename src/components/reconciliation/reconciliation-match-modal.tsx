"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"

import {
  createAndSettlePayableAction,
  createAndSettleReceivableAction,
  createSettlementBatchAction,
  searchCandidateEntriesAction,
} from "@/app/(app)/reconciliation/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatBRL, formatDate } from "@/lib/format"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import type { CandidateEntry } from "@/modules/settlements/types"
import { cn } from "@/lib/utils"

interface SelectedCandidate {
  entry: CandidateEntry
  amount: number
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
  bankAccountId,
  contacts,
  categories,
}: {
  open: boolean
  onClose: () => void
  onSettled: () => void
  bankTransactionId: string
  direction: "RECEIVABLE" | "PAYABLE"
  transactionAmount: number
  bankAccountId: string
  contacts: Contact[]
  categories: Category[]
}) {
  const [tab, setTab] = React.useState<"buscar" | "criar">("buscar")
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CandidateEntry[]>([])
  const [selected, setSelected] = React.useState<Record<string, SelectedCandidate>>({})
  const [items, setItems] = React.useState<NewItem[]>([
    { contactId: "", categoryId: "", description: "", amount: Math.abs(transactionAmount) },
  ])
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const expenseCategories = categories.filter((category) => category.type === "EXPENSE")
  const incomeCategories = categories.filter((category) => category.type === "INCOME")
  const categoryOptions = direction === "PAYABLE" ? expenseCategories : incomeCategories
  const absTransactionAmount = Math.abs(transactionAmount)

  React.useEffect(() => {
    let ignore = false
    searchCandidateEntriesAction({ type: direction, query: query.trim() || undefined }).then((response) => {
      if (ignore) return
      if (response.ok) setResults(response.data)
    })
    return () => {
      ignore = true
    }
  }, [open, direction, query])

  function toggleCandidate(entry: CandidateEntry) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[entry.id]) {
        delete next[entry.id]
      } else {
        next[entry.id] = { entry, amount: entry.amount - (entry.settledAmount ?? 0) }
      }
      return next
    })
  }

  function setCandidateAmount(entryId: string, amount: number) {
    setSelected((prev) => (prev[entryId] ? { ...prev, [entryId]: { ...prev[entryId], amount } } : prev))
  }

  function updateItem(index: number, patch: Partial<NewItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const selectedList = Object.values(selected)
  const sumSelected = selectedList.reduce((sum, s) => sum + s.amount, 0)
  const diffSelected = absTransactionAmount - sumSelected

  async function confirmSearch() {
    if (selectedList.length === 0) return
    setPending(true)
    setError(null)
    const response = await createSettlementBatchAction({
      bankTransactionId,
      items: selectedList.map((s) => ({ entryId: s.entry.id, settledAmount: s.amount, settledAt: new Date() })),
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
        settledAt: new Date(),
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
      <DialogContent className="max-w-xl">
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
          <div className="flex flex-col gap-3">
            <div className="relative">
              <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por contato ou descrição..."
                className="pl-8"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {results.map((entry) => {
                const isSelected = Boolean(selected[entry.id])
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border p-3",
                      isSelected && "border-primary bg-primary/5",
                    )}
                  >
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => toggleCandidate(entry)}>
                      <p className="truncate text-sm font-medium">{entry.contactName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {entry.description} · {formatDate(entry.dueDate)}
                      </p>
                    </button>
                    {isSelected ? (
                      <Input
                        type="number"
                        className="w-28 text-right"
                        value={selected[entry.id].amount / 100}
                        onChange={(event) =>
                          setCandidateAmount(entry.id, Math.round(Number(event.target.value) * 100))
                        }
                      />
                    ) : (
                      <span className="text-sm font-semibold">
                        {formatBRL(entry.amount - (entry.settledAmount ?? 0))}
                      </span>
                    )}
                  </div>
                )
              })}
              {results.length === 0 && query && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento encontrado.</p>
              )}
            </div>

            {selectedList.length > 0 && (
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Soma: <span className="font-semibold text-foreground">{formatBRL(sumSelected)}</span>
                  {diffSelected === 0 ? (
                    <span className="ml-2 text-emerald-600">✓ confere com a transação</span>
                  ) : (
                    <span className="ml-2 text-amber-600">diferença de {formatBRL(Math.abs(diffSelected))}</span>
                  )}
                </span>
                <Button size="sm" onClick={confirmSearch} disabled={pending}>
                  Vincular e conciliar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border bg-muted p-3">
                <div className="flex items-center gap-2">
                  <Select value={item.contactId} onValueChange={(value) => value && updateItem(index, { contactId: value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Contato">
                        {(value: string) => contacts.find((contact) => contact.id === value)?.name ?? "Contato"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={item.categoryId}
                    onValueChange={(value) => value && updateItem(index, { categoryId: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Categoria">
                        {(value: string) => categoryOptions.find((category) => category.id === value)?.name ?? "Categoria"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Descrição"
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    className="w-28 text-right"
                    value={item.amount / 100}
                    onChange={(event) => updateItem(index, { amount: Math.round(Number(event.target.value) * 100) })}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, { contactId: "", categoryId: "", description: "", amount: 0 }])
              }
              className="rounded-lg border border-dashed p-2 text-sm text-muted-foreground hover:bg-accent"
            >
              + Adicionar outro lançamento
            </button>

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
