"use client"

import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { QuickAddContactDialog } from "@/components/contacts/quick-add-contact-dialog"
import { CurrencyInput } from "@/components/sales/currency-input"
import { SearchableSelect } from "@/components/sales/searchable-select"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  allocatedPercent,
  allocationAmount,
  type AllocationRow,
  type EntryDraft,
} from "@/lib/entries/draft"
import { formatBRL } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Contact } from "@/modules/contacts/types"
import type { AllocationMode } from "@/modules/sales/types"

/**
 * A 0–100 number field that tracks its own draft text instead of mirroring
 * `value` on every keystroke. A plain controlled `<input type="number">`
 * re-renders with the clamped number after each change, so clearing the
 * field to retype it (100 → 30) snaps to "0" mid-edit.
 */
function PercentageInput({
  value,
  onValueChange,
  "aria-label": ariaLabel,
}: {
  value: number
  onValueChange: (value: number) => void
  "aria-label": string
}) {
  const [draft, setDraft] = React.useState(String(value))
  const [lastValue, setLastValue] = React.useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(String(value))
  }

  return (
    <InputGroup className="w-20">
      <InputGroupInput
        inputMode="decimal"
        aria-label={ariaLabel}
        className="text-right tabular-nums"
        value={draft}
        onChange={(event) => {
          const raw = event.target.value.replace(",", ".")
          setDraft(event.target.value)
          if (raw === "") return
          const parsed = Number(raw)
          if (!Number.isNaN(parsed)) onValueChange(Math.min(100, Math.max(0, parsed)))
        }}
        onBlur={() => setDraft(String(value))}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>%</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

type AllocationPatch = Pick<EntryDraft, "allocationEnabled" | "allocationMode" | "allocations">

/**
 * Repasse da venda (RN-04): optional, but once there's a beneficiary the
 * rows must add up to exactly the sale's value. The bar shows how far the
 * split is from that, so the user doesn't find out only on save.
 */
export function AllocationEditor({
  draft,
  beneficiaries,
  error,
  onChange,
  onBeneficiaryCreated,
}: {
  draft: EntryDraft
  beneficiaries: Contact[]
  error?: string
  onChange: (patch: Partial<AllocationPatch>) => void
  onBeneficiaryCreated: (contact: Contact) => void
}) {
  const { allocationMode: mode, allocations: rows, amount: base } = draft

  if (!draft.allocationEnabled) {
    return (
      <button
        type="button"
        onClick={() =>
          onChange({
            allocationEnabled: true,
            allocations:
              rows.length > 0
                ? rows
                : [{ id: crypto.randomUUID(), beneficiaryId: "", value: mode === "PERCENTAGE" ? 100 : base }],
          })
        }
        className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors outline-none hover:border-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-capi-lilac"
      >
        <PlusIcon className="size-4" />
        Adicionar repasse
      </button>
    )
  }

  const options = beneficiaries.map((contact) => ({ value: contact.id, label: contact.name }))
  const percent = allocatedPercent(draft)
  const allocated = rows.reduce((sum, row) => sum + allocationAmount(mode, base, row.value), 0)

  function setRows(next: AllocationRow[]) {
    onChange({ allocations: next })
  }

  function updateRow(id: string, patch: Partial<AllocationRow>) {
    setRows(
      rows.map((row) => {
        if (row.id !== id) return row
        // A fixed-amount row can never take more than what the other rows
        // leave of the total.
        if (mode === "FIXED_AMOUNT" && patch.value !== undefined) {
          const others = rows.reduce((sum, r) => (r.id === id ? sum : sum + r.value), 0)
          return { ...row, ...patch, value: Math.min(patch.value, Math.max(0, base - others)) }
        }
        return { ...row, ...patch }
      }),
    )
  }

  function changeMode(next: AllocationMode) {
    if (next === mode) return
    // Convert what was typed so switching modes keeps the same split.
    const converted = rows.map((row) => ({
      ...row,
      value:
        next === "FIXED_AMOUNT"
          ? allocationAmount("PERCENTAGE", base, row.value)
          : base > 0
            ? Math.round((row.value / base) * 10000) / 100
            : 0,
    }))
    onChange({ allocationMode: next, allocations: converted })
  }

  const status =
    rows.length === 0
      ? null
      : Math.abs(percent - 100) < 0.005
        ? { text: "Fecha 100% do valor", className: "text-positive" }
        : percent > 100
          ? { text: `Passou ${(percent - 100).toLocaleString("pt-BR")}% do valor`, className: "text-destructive" }
          : { text: `Falta distribuir ${(100 - percent).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`, className: "text-warning" }

  return (
    <div data-field="allocations" className="flex flex-col gap-3 rounded-xl border p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Repasse</h3>
        <div className="flex items-center gap-1">
          <ToggleGroup
            variant="outline"
            size="sm"
            spacing={0}
            value={[mode]}
            onValueChange={(value) => value[0] && changeMode(value[0] as AllocationMode)}
          >
            <ToggleGroupItem value="PERCENTAGE">Percentual</ToggleGroupItem>
            <ToggleGroupItem value="FIXED_AMOUNT">Valor fixo</ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => onChange({ allocationEnabled: false, allocations: [] })}
          >
            Remover
          </Button>
        </div>
      </div>

      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <SearchableSelect
            className="min-w-0 flex-1"
            options={options}
            value={row.beneficiaryId}
            onValueChange={(value) => updateRow(row.id, { beneficiaryId: value })}
            placeholder="Selecione o favorecido"
            footer={
              <QuickAddContactDialog
                contactType="BENEFICIARY"
                triggerLabel="Novo favorecido"
                dialogTitle="Novo favorecido"
                onCreated={(contact) => {
                  onBeneficiaryCreated(contact)
                  updateRow(row.id, { beneficiaryId: contact.id })
                }}
              />
            }
          />
          {mode === "PERCENTAGE" ? (
            <PercentageInput
              aria-label={`Percentual do favorecido ${index + 1}`}
              value={row.value}
              onValueChange={(value) => updateRow(row.id, { value })}
            />
          ) : (
            <CurrencyInput
              className="w-32"
              aria-label={`Valor do favorecido ${index + 1}`}
              valueInCents={row.value}
              onValueChange={(value) => updateRow(row.id, { value })}
            />
          )}
          {mode === "PERCENTAGE" && (
            <span className="hidden w-24 shrink-0 text-right text-sm font-medium tabular-nums sm:block">
              {formatBRL(allocationAmount(mode, base, row.value))}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Remover favorecido ${index + 1}`}
            onClick={() => setRows(rows.filter((r) => r.id !== row.id))}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}

      {rows.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-label="Parte do valor distribuída"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, percent)}
          >
            <div
              className={cn("h-full rounded-full", percent > 100 ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              Distribuído <span className="font-semibold text-foreground tabular-nums">{formatBRL(allocated)}</span>
            </span>
            {status && <span className={cn("font-medium", status.className)}>{status.text}</span>}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary dark:text-capi-lilac"
          onClick={() => setRows([...rows, { id: crypto.randomUUID(), beneficiaryId: "", value: 0 }])}
        >
          <PlusIcon />
          Adicionar favorecido
        </Button>
      </div>
    </div>
  )
}
