"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CurrencyInput } from "@/components/sales/currency-input"
import { formatBRL, formatDate } from "@/lib/format"
import type { Installment } from "@/modules/sales/types"

export function InstallmentsDialog({
  installments,
  onChange,
}: {
  installments: Installment[]
  onChange: (installmentNumber: number, patch: Partial<Pick<Installment, "dueDate" | "amount">>) => void
}) {
  const total = installments.reduce((sum, installment) => sum + installment.amount, 0)

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="link" size="sm" className="h-auto p-0" />}>
        Ver todas
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Parcelas</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-96 pr-3">
          <div className="flex flex-col gap-3">
            {installments.map((installment) => (
              <div
                key={installment.installmentNumber}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="w-6 shrink-0 text-sm font-medium text-muted-foreground">
                  {installment.installmentNumber}
                </span>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 justify-start font-normal"
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
                      onSelect={(date) =>
                        date && onChange(installment.installmentNumber, { dueDate: date })
                      }
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <CurrencyInput
                  className="w-40"
                  valueInCents={installment.amount}
                  onValueChange={(amount) => onChange(installment.installmentNumber, { amount })}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-between border-t pt-3 text-sm font-medium">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
