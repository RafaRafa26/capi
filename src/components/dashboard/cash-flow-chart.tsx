"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import type { DateRange } from "react-day-picker";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/format";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { fluxoCaixaDiario } from "@/lib/mock-data/fluxo-caixa";

const chartConfig = {
  saldo: {
    label: "Saldo",
    color: "#2563eb",
  },
  entradas: {
    label: "Entradas",
    color: "#0d9488",
  },
  saidas: {
    label: "Saídas",
    color: "#e5484d",
  },
} satisfies ChartConfig;

function formatAxisDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatTooltipDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function CashFlowChart() {
  const [activeSerie, setActiveSerie] = useState<keyof typeof chartConfig>("saldo");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date("2026-08-01T00:00:00"),
    to: new Date("2026-08-17T00:00:00"),
  });

  const filteredData = useMemo(() => {
    const range = !dateRange?.from
      ? fluxoCaixaDiario
      : fluxoCaixaDiario.filter((day) => {
          const from = dateRange.from!.getTime();
          const to = (dateRange.to ?? dateRange.from!).getTime();
          const time = new Date(`${day.date}T00:00:00`).getTime();
          return time >= from && time <= to;
        });
    return range.map((day) => ({ ...day, saldo: day.entradas - day.saidas }));
  }, [dateRange]);

  const totals = useMemo(() => {
    const entradas = filteredData.reduce((sum, day) => sum + day.entradas, 0);
    const saidas = filteredData.reduce((sum, day) => sum + day.saidas, 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [filteredData]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="size-5" viewBox="0 0 20 20" fill="none">
            <path d="M3 17V9M9 17V5M15 17v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold">Fluxo de caixa</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <div className="border-border overflow-hidden rounded-lg border">
        <div className="flex">
          {(Object.keys(chartConfig) as (keyof typeof chartConfig)[]).map((key) => (
            <button
              key={key}
              type="button"
              data-active={activeSerie === key}
              onClick={() => setActiveSerie(key)}
              className="flex-1 border-r px-4 py-2.5 text-left last:border-r-0 data-[active=true]:bg-muted/50"
            >
              <span className="text-muted-foreground text-xs">{chartConfig[key].label}</span>
              <p className="text-base font-bold" style={{ color: chartConfig[key].color }}>
                {formatMoney(totals[key])}
              </p>
            </button>
          ))}
        </div>
        <Separator />
        <ChartContainer config={chartConfig} className="aspect-auto h-[160px] w-full px-2 pt-2">
          <LineChart accessibilityLayer data={filteredData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatAxisDate}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[160px]"
                  labelFormatter={(value) => formatTooltipDate(value as string)}
                  formatter={(value) => formatMoney(Number(value))}
                />
              }
            />
            <Line
              dataKey={activeSerie}
              type="monotone"
              stroke={`var(--color-${activeSerie})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <Link href="/conciliacao" className="text-sm font-medium text-[#2563eb]">
        Gerenciar fluxo de caixa →
      </Link>
    </div>
  );
}
