"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import type { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatBRL, formatMonthShort, formatMonthYearShort } from "@/lib/format"
import { recebimentosPorMes, totalRecebidoNoPeriodo } from "@/lib/mock/dashboard"

const chartConfig = {
  valor: {
    label: "Recebimentos",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const primeiroMes = recebimentosPorMes[0].mes
const ultimoMes = recebimentosPorMes[recebimentosPorMes.length - 1].mes

export function ChartMonthlyReceipts() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: primeiroMes,
    to: ultimoMes,
  })

  const filteredData = React.useMemo(() => {
    if (!dateRange?.from) return recebimentosPorMes
    const from = dateRange.from
    const to = dateRange.to ?? dateRange.from
    return recebimentosPorMes.filter(
      (ponto) => ponto.mes >= from && ponto.mes <= to
    )
  }, [dateRange])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recebimentos por mês</CardTitle>
          <CardDescription>
            {formatMonthShort(primeiroMes)} {primeiroMes.getFullYear()} –{" "}
            {formatMonthShort(ultimoMes)} {ultimoMes.getFullYear()}
          </CardDescription>
        </div>
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="font-normal" />
            }
          >
            <CalendarIcon />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {formatMonthYearShort(dateRange.from)} –{" "}
                  {formatMonthYearShort(dateRange.to)}
                </>
              ) : (
                formatMonthYearShort(dateRange.from)
              )
            ) : (
              <span>Selecionar período</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={ptBR}
              showOutsideDays={false}
            />
          </PopoverContent>
        </Popover>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-62.5 w-full">
          <BarChart accessibilityLayer data={filteredData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="mes"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => formatMonthYearShort(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => formatBRL(value as number)}
                />
              }
            />
            <Bar dataKey="valor" fill="var(--color-valor)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="leading-none text-muted-foreground">
          Total recebido no período: {formatBRL(totalRecebidoNoPeriodo)}
        </div>
      </CardFooter>
    </Card>
  )
}
