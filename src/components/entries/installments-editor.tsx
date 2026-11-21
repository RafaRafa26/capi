"use client"

import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { CurrencyInput } from "@/components/sales/currency-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatBRL, formatDate } from "@/lib/format"
import type { Installment } from "@/modules/sales/types"

function shortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function isEdited(installment: Installment, generated: Installment | undefined) {
  if (!generated) return false
  return (
    installment.amount !== generated.amount ||
    installment.dueDate.getTime() !== generated.dueDate.getTime()
  )
}

/** Collapsed view: the first few installments as chips. */
export function InstallmentChips({
  installments,
  generated,
  limit = 3,
}: {
  installments: Installment[]
  generated: Installment[]
  limit?: number
}) {
  const hidden = installments.length - limit
  return (
    <div className="flex flex-wrap gap-1.5">
      {installments.slice(0, limit).map((installment, index) => (
        <span
          key={installment.installmentNumber}
          className={
            isEdited(installment, generated[index])
              ? "rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground tabular-nums"
              : "rounded-md bg-muted px-2 py-1 text-xs tabular-nums"
          }
        >
          {installment.installmentNumber} · {shortDate(installment.dueDate)} · {formatBRL(installment.amount)}
        </span>
      ))}
      {hidden > 0 && (
        <span className="px-1 py-1 text-xs text-muted-foreground">+{hidden}</span>
      )}
    </div>
  )
}

/**
 * Every installment with its date and amount editable in place — replaces
 * the old "Ver todas" dialog, which inside the sheet would have been a modal
 * on top of a modal.
 */
export function InstallmentsEditor({
  installments,
  generated,
  onChange,
}: {
  installments: Installment[]
  generated: Installment[]
  onChange: (installmentNumber: number, patch: Partial<Pick<Installment, "dueDate" | "amount">>) => void
}) {
  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {installments.map((installment, index) => {
        const edited = isEdited(installment, generated[index])
        return (
          <div key={installment.installmentNumber} className="flex items-center gap-2 px-2 py-1.5">
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
              {installment.installmentNumber}
            </span>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal tabular-nums"
                    aria-label={`Vencimento da parcela ${installment.installmentNumber}`}
                  />
                }
              >
                <CalendarIcon />
                {formatDate(installment.dueDate)}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={installment.dueDate}
                  onSelect={(value) => value && onChange(installment.installmentNumber, { dueDate: value })}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            {edited && (
              <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                editada
              </span>
            )}
            <CurrencyInput
              className="ml-auto w-36"
              aria-label={`Valor da parcela ${installment.installmentNumber}`}
              valueInCents={installment.amount}
              onValueChange={(amount) => onChange(installment.installmentNumber, { amount })}
            />
          </div>
        )
      })}
    </div>
  )
}
