"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"
import type { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatBRL, formatDayMonth } from "@/lib/format"
import { fluxoCaixa } from "@/lib/mock/dashboard"
import { CalendarIcon, LineChartIcon } from "lucide-react"

const chartConfig = {
  saldo: {
    label: "Saldo",
    color: "var(--foreground)",
  },
  entradas: {
    label: "Entradas",
    color: "var(--color-emerald-500)",
  },
  saidas: {
    label: "Saídas",
    color: "var(--color-red-500)",
  },
} satisfies ChartConfig

const valueClassName: Record<keyof typeof chartConfig, string> = {
  saldo: "",
  entradas: "text-emerald-500",
  saidas: "text-red-500",
}

const primeiroDia = fluxoCaixa.serie[0].data
const ultimoDia = fluxoCaixa.serie[fluxoCaixa.serie.length - 1].data

export function ChartCashFlow() {
  const [activeSeries, setActiveSeries] =
    React.useState<keyof typeof chartConfig>("saldo")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: primeiroDia,
    to: ultimoDia,
  })

  const totals: Record<keyof typeof chartConfig, number> = {
    saldo: fluxoCaixa.saldo,
    entradas: fluxoCaixa.entradas,
    saidas: fluxoCaixa.saidas,
  }

  const filteredData = React.useMemo(() => {
    if (!dateRange?.from) return fluxoCaixa.serie
    const from = dateRange.from
    const to = dateRange.to ?? dateRange.from
    return fluxoCaixa.serie.filter(
      (ponto) => ponto.data >= from && ponto.data <= to
    )
  }, [dateRange])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="size-4" />
          Fluxo de caixa
        </CardTitle>
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
                  {formatDayMonth(dateRange.from)} –{" "}
                  {formatDayMonth(dateRange.to)}
                </>
              ) : (
                formatDayMonth(dateRange.from)
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
        <div className="mb-4 grid grid-cols-3 gap-3">
          {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map(
            (key) => (
              <button
                key={key}
                type="button"
                data-active={activeSeries === key}
                onClick={() => setActiveSeries(key)}
                className="rounded-lg p-3 text-left transition-colors hover:bg-muted/30 data-[active=true]:border data-[active=true]:bg-muted/30"
              >
                <p className="text-sm text-muted-foreground">
                  {chartConfig[key].label}
                </p>
                <p className={`text-lg font-semibold ${valueClassName[key]}`}>
                  {formatBRL(totals[key])}
                </p>
              </button>
            )
          )}
        </div>
        <ChartContainer config={chartConfig} className="aspect-auto h-62.5 w-full">
          <LineChart
            accessibilityLayer
            data={filteredData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="data"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => formatDayMonth(value)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    formatDayMonth(
                      (payload?.[0]?.payload as { data: Date })?.data
                    )
                  }
                  formatter={(value) => formatBRL(value as number)}
                />
              }
            />
            <Line
              dataKey={activeSeries}
              type="monotone"
              stroke={`var(--color-${activeSeries})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
        <a
          href="#"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Gerenciar fluxo de caixa →
        </a>
      </CardContent>
    </Card>
  )
}
