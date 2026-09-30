"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, CheckIcon, ChevronDownIcon } from "lucide-react"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { useHideValues } from "@/components/overview/hide-values"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { balanceAxisScale } from "@/lib/chart-scale"
import { formatBRL, formatCompactBRL, formatDate } from "@/lib/format"
import {
  buildBalanceSeries,
  flowPeriodLabel,
  flowPeriodOrder,
  getFlowPeriod,
  toDayKey,
  type DailyAmount,
  type FlowPeriodPreset,
} from "@/modules/dashboard/domain"

const chartConfig = {
  realizado: { label: "Realizado", color: "var(--chart-1)" },
} satisfies ChartConfig

function axisLabel(date: Date, today: Date): string {
  const pattern = date.getFullYear() === today.getFullYear() ? "d MMM" : "d MMM yyyy"
  return format(date, pattern, { locale: ptBR }).replace(".", "")
}

interface FlowChartCardProps {
  currentBalance: number
  realizedByDay: DailyAmount[]
  sideHeight: number | undefined
  className?: string
}

function cardProps(className: string | undefined, sideHeight: number | undefined) {
  return {
    className: `flex flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5 ${className ?? ""}`,
    style: { "--side-h": sideHeight ? `${sideHeight}px` : undefined } as React.CSSProperties,
  }
}

const noopSubscribe = () => () => {}

/**
 * "Hoje" is the viewer's calendar day, which the server can't know (it may sit
 * in UTC while it's still yesterday evening in Brazil) — so the chart renders
 * only on the client, behind an empty card of the same size.
 */
export function FlowChartCard(props: FlowChartCardProps) {
  const todayKey = React.useSyncExternalStore(noopSubscribe, () => toDayKey(new Date()), () => null)

  if (!todayKey) {
    return (
      <div {...cardProps(props.className, props.sideHeight)} aria-busy="true">
        <FlowChartCardSkeletonBody />
      </div>
    )
  }

  return <FlowChart {...props} todayKey={todayKey} />
}

function FlowChart({
  currentBalance,
  realizedByDay,
  sideHeight,
  className,
  todayKey,
}: FlowChartCardProps & { todayKey: string }) {
  const [preset, setPreset] = React.useState<FlowPeriodPreset>("month")
  const today = React.useMemo(() => {
    const [y, m, d] = todayKey.split("-").map(Number)
    return new Date(y, m - 1, d)
  }, [todayKey])
  const period = React.useMemo(() => getFlowPeriod(preset, today), [preset, today])

  const series = React.useMemo(
    () =>
      buildBalanceSeries({
        from: period.from,
        to: period.to,
        today,
        currentBalance,
        realized: realizedByDay,
      }),
    [period, today, currentBalance, realizedByDay],
  )

  const { hidden } = useHideValues()

  const chartData = React.useMemo(
    () => series.map((point) => ({ day: point.day, date: point.date, realizado: point.balance })),
    [series],
  )

  const yScale = React.useMemo(() => balanceAxisScale(series.map((point) => point.balance)), [series])

  return (
    <div {...cardProps(className, sideHeight)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 className="text-sm font-semibold">Fluxo de caixa</h2>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" className="h-8 gap-1.5 px-2.5 text-[13px] font-medium text-foreground" />
              }
            >
              <CalendarIcon className="size-3.5" />
              {flowPeriodLabel[preset]}
              <ChevronDownIcon className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} backdrop className="w-auto min-w-[200px] p-1">
              {flowPeriodOrder.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setPreset(option)}
                  className={`rounded-md px-2.5 py-[7px] text-[13px] ${option === preset ? "bg-accent" : ""}`}
                >
                  {flowPeriodLabel[option]}
                  {option === preset && <CheckIcon className="ml-auto size-3.5" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Absolute inside a flex-1 box: the chart fills whatever height the card
          gets instead of feeding its own size back into the grid row. */}
      <div className="relative min-h-[180px] flex-1">
        <ChartContainer config={chartConfig} className="absolute inset-0 aspect-auto">
          <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12, top: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const [y, m, d] = value.split("-").map(Number)
                return axisLabel(new Date(y, m - 1, d), today)
              }}
            />
            <YAxis
              domain={yScale.domain}
            ticks={yScale.ticks}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value) => (hidden ? "•••" : formatCompactBRL(value as number))}
            />
            <ReferenceLine y={0} stroke="var(--border)" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-44"
                  labelFormatter={(_, payload) => formatDate(payload?.[0]?.payload?.date)}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                      <span className="font-medium tabular-nums">{hidden ? "R$ •••••" : formatBRL(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Line
              dataKey="realizado"
              type="monotone"
              stroke="var(--color-realizado)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
}

/** Card contents while the chart can't render yet — also used by the page's loading skeleton. */
export function FlowChartCardSkeletonBody() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 className="text-sm font-semibold">Fluxo de caixa</h2>
        <Skeleton className="ml-auto h-8 w-36" />
      </div>
      <Skeleton className="min-h-[180px] w-full flex-1" />
    </>
  )
}
