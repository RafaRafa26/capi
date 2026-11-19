"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"

import { useHideValues } from "@/components/overview/hide-values"
import { PeriodFilter } from "@/components/accounts/period-filter"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { getPeriodRange, type PeriodRange } from "@/lib/accounts/filter"
import { balanceAxisScale } from "@/lib/chart-scale"
import { formatBRL, formatCompactBRL, formatDate } from "@/lib/format"
import {
  buildBalanceSeries,
  flowSeriesBounds,
  fromDayKey,
  toDayKey,
  type DailyAmount,
} from "@/modules/dashboard/domain"

const chartConfig = {
  realizado: { label: "Realizado", color: "var(--chart-1)" },
  previsto: { label: "Previsto", color: "var(--chart-1)" },
} satisfies ChartConfig

function axisLabel(date: Date, today: Date): string {
  const pattern = date.getFullYear() === today.getFullYear() ? "d MMM" : "d MMM yyyy"
  return format(date, pattern, { locale: ptBR }).replace(".", "")
}

interface FlowChartCardProps {
  currentBalance: number
  realizedByDay: DailyAmount[]
  forecastByDay: DailyAmount[]
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
  forecastByDay,
  sideHeight,
  className,
  todayKey,
}: FlowChartCardProps & { todayKey: string }) {
  const today = React.useMemo(() => fromDayKey(todayKey), [todayKey])
  const [range, setRange] = React.useState<PeriodRange>(() => getPeriodRange("month", today))
  const period = React.useMemo(
    () => flowSeriesBounds(range, today, realizedByDay, forecastByDay),
    [range, today, realizedByDay, forecastByDay],
  )

  const series = React.useMemo(
    () =>
      buildBalanceSeries({
        from: period.from,
        to: period.to,
        today,
        currentBalance,
        realized: realizedByDay,
        forecast: forecastByDay,
      }),
    [period, today, currentBalance, realizedByDay, forecastByDay],
  )

  const { hidden } = useHideValues()

  const chartData = React.useMemo(
    () =>
      series.map((point) => ({
        day: point.day,
        date: point.date,
        // Today sits on both lines so the dotted projection starts where the solid one ends.
        realizado: point.projected ? null : point.balance,
        previsto: point.projected || point.day === todayKey ? point.balance : null,
      })),
    [series, todayKey],
  )
  const showToday = series.some((point) => point.projected) && series.some((point) => !point.projected)

  const yScale = React.useMemo(() => balanceAxisScale(series.map((point) => point.balance)), [series])

  return (
    <div {...cardProps(className, sideHeight)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <h2 className="text-sm font-semibold">Fluxo de caixa</h2>
        <div className="ml-auto">
          <PeriodFilter value={range} onChange={setRange} today={today} label={null} />
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
            {showToday && <ReferenceLine x={todayKey} stroke="var(--border)" strokeDasharray="2 3" />}
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-44"
                  labelFormatter={(_, payload) => formatDate(payload?.[0]?.payload?.date)}
                  formatter={(value, name, item) => {
                    // On today both series carry the same balance — show it once, as realizado.
                    if (name === "previsto" && item?.payload?.realizado != null) return null
                    return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{chartConfig[name as keyof typeof chartConfig]?.label}</span>
                      <span className="font-medium tabular-nums">{hidden ? "R$ •••••" : formatBRL(Number(value))}</span>
                    </div>
                    )
                  }}
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
              connectNulls={false}
            />
            <Line
              dataKey="previsto"
              type="monotone"
              stroke="var(--color-previsto)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
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
        <Skeleton className="ml-auto h-[34px] w-[264px]" />
      </div>
      <Skeleton className="min-h-[180px] w-full flex-1" />
    </>
  )
}
