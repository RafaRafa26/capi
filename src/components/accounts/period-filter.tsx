"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
  { preset: "all", label: "Todo o período" },
]

function toDateRange(range: PeriodRange): DateRange | undefined {
  return range.from ? { from: range.from, to: range.to ?? undefined } : undefined
}

export function PeriodFilter({
  value,
  onChange,
  today,
  label = "Vencimento",
}: {
  value: PeriodRange
  onChange: (range: PeriodRange) => void
  today: Date
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>(() => toDateRange(value))
  const [showCustom, setShowCustom] = React.useState(value.preset === "custom")

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setShowCustom(false)
  }

  function selectPreset(preset: PeriodPreset) {
    if (preset === "custom") {
      // Parte do período que já está na tela (este mês, este ano...), para só ajustar.
      setCustomRange(toDateRange(value))
      setShowCustom(true)
      return
    }
    onChange(getPeriodRange(preset, today))
    setOpen(false)
  }

  function applyCustom() {
    if (!customRange?.from) return
    // Um clique só escolhe um dia: o período é aquele dia.
    onChange(getPeriodRange("custom", today, { from: customRange.from, to: customRange.to ?? customRange.from }))
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
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
          <PopoverContent align="start" className={cn("p-1", showCustom ? "w-auto" : "w-64")}>
            {/* Uma tela por vez: os atalhos, ou o calendário no lugar deles. */}
            {!showCustom ? (
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
                  {value.preset === "custom" ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="flex items-center gap-1 border-b border-border pb-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Voltar aos atalhos"
                    onClick={() => setShowCustom(false)}
                  >
                    <ArrowLeftIcon />
                  </Button>
                  <span className="text-sm font-medium">Período personalizado</span>
                </div>
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  defaultMonth={customRange?.from ?? today}
                  locale={ptBR}
                />
                <div className="flex flex-col gap-2 border-t border-border px-2 pt-2 pb-1">
                  <p className="text-center text-xs text-muted-foreground">
                    {customRange?.from
                      ? `${formatDate(customRange.from)} – ${formatDate(customRange.to ?? customRange.from)}`
                      : "Escolha a data inicial e a final"}
                  </p>
                  <Button className="w-full" onClick={applyCustom} disabled={!customRange?.from}>
                    Aplicar
                  </Button>
                </div>
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
