"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  canShiftPeriod,
  getPeriodRange,
  periodLabel,
  shiftPeriod,
  type PeriodPreset,
  type PeriodRange,
} from "@/lib/accounts/filter"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const presetOptions: { preset: PeriodPreset; label: string }[] = [
  { preset: "today", label: "Hoje" },
  { preset: "week", label: "Esta semana" },
  { preset: "month", label: "Este mês" },
  { preset: "year", label: "Este ano" },
  { preset: "last30", label: "Últimos 30 dias" },
  { preset: "last12months", label: "Últimos 12 meses" },
  { preset: "all", label: "Todo o período" },
]

function toInputValue(date: Date | null): string {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function fromInputValue(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function PeriodFilter({
  value,
  onChange,
  today,
}: {
  value: PeriodRange
  onChange: (range: PeriodRange) => void
  today: Date
}) {
  const [open, setOpen] = React.useState(false)
  const [customFrom, setCustomFrom] = React.useState(toInputValue(value.from))
  const [customTo, setCustomTo] = React.useState(toInputValue(value.to))
  const [showCustom, setShowCustom] = React.useState(value.preset === "custom")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setShowCustom(value.preset === "custom")
      setCustomFrom(toInputValue(value.from))
      setCustomTo(toInputValue(value.to))
    }
  }

  function selectPreset(preset: PeriodPreset) {
    if (preset === "custom") {
      setShowCustom(true)
      return
    }
    onChange(getPeriodRange(preset, today))
    setOpen(false)
  }

  function applyCustom() {
    const from = fromInputValue(customFrom)
    const to = fromInputValue(customTo)
    if (!from || !to) return
    onChange(getPeriodRange("custom", today, { from, to }))
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Vencimento</span>
      <div className="flex h-[34px] items-stretch overflow-hidden rounded-lg border border-input">
        <button
          type="button"
          aria-label="Período anterior"
          disabled={!canShiftPeriod(value.preset)}
          onClick={() => onChange(shiftPeriod(value, -1))}
          className="flex w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <div className="w-px shrink-0 bg-border" />
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex min-w-[200px] items-center justify-center gap-1.5 px-3 text-sm font-medium hover:bg-muted"
              />
            }
          >
            {periodLabel(value, today)}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1">
            <div className="flex flex-col">
              {presetOptions.map((option) => (
                <button
                  key={option.preset}
                  type="button"
                  onClick={() => selectPreset(option.preset)}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                    value.preset === option.preset && "bg-accent font-medium",
                  )}
                >
                  {option.label}
                  {value.preset === option.preset && <CheckIcon className="size-4" />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => selectPreset("custom")}
                className={cn(
                  "flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                  value.preset === "custom" && "bg-accent font-medium",
                )}
              >
                Período personalizado
                {value.preset === "custom" && <CheckIcon className="size-4" />}
              </button>
            </div>

            {showCustom && (
              <div className="mt-1 flex flex-col gap-2 border-t border-border p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="accounts-period-from" className="text-xs text-muted-foreground">
                      De
                    </Label>
                    <Input
                      id="accounts-period-from"
                      type="date"
                      value={customFrom}
                      onChange={(event) => setCustomFrom(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="accounts-period-to" className="text-xs text-muted-foreground">
                      Até
                    </Label>
                    <Input
                      id="accounts-period-to"
                      type="date"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full" onClick={applyCustom} disabled={!customFrom || !customTo}>
                  Aplicar
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        <div className="w-px shrink-0 bg-border" />
        <button
          type="button"
          aria-label="Próximo período"
          disabled={!canShiftPeriod(value.preset)}
          onClick={() => onChange(shiftPeriod(value, 1))}
          className="flex w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      {value.preset === "custom" && value.from && value.to && (
        <span className="sr-only">
          {formatDate(value.from)} – {formatDate(value.to)}
        </span>
      )}
    </div>
  )
}
