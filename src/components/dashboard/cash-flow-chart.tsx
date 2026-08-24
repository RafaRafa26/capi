"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { formatMoney, formatMoneyCompact } from "@/lib/format";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { fluxoCaixaDiario, HOJE } from "@/lib/mock-data/fluxo-caixa";

const chartConfig = {
  saldo: {
    label: "Saldo",
    color: "#0a0a0a",
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

// Saldo acumulado desde o início da série mockada — não reinicia ao trocar o
// período filtrado, para refletir um saldo de conta de verdade.
const fluxoCaixaAcumulado = (() => {
  let saldo = 0;
  return fluxoCaixaDiario.map((day) => {
    saldo += day.entradas - day.saidas;
    return {
      ...day,
      saldo,
      isFuture: new Date(`${day.date}T00:00:00`) > HOJE,
    };
  });
})();

export function CashFlowChart() {
  const [activeSerie, setActiveSerie] = useState<keyof typeof chartConfig>("saldo");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date("2026-08-01T00:00:00"),
    to: new Date("2026-08-17T00:00:00"),
  });

  const filteredData = useMemo(() => {
    if (!dateRange?.from) return fluxoCaixaAcumulado;
    const from = dateRange.from.getTime();
    const to = (dateRange.to ?? dateRange.from).getTime();
    return fluxoCaixaAcumulado.filter((day) => {
      const time = new Date(`${day.date}T00:00:00`).getTime();
      return time >= from && time <= to;
    });
  }, [dateRange]);

  const totals = useMemo(() => {
    const entradas = filteredData.reduce((sum, day) => sum + day.entradas, 0);
    const saidas = filteredData.reduce((sum, day) => sum + day.saidas, 0);
    const saldo = filteredData.at(-1)?.saldo ?? 0;
    return { entradas, saidas, saldo };
  }, [filteredData]);

  // Divide a série ativa em um trecho "real" (sólido) e um "previsto"
  // (pontilhado), com o dia de virada presente nos dois para as linhas se
  // encontrarem sem espaço em branco entre elas.
  const chartData = useMemo(() => {
    const lastRealIndex = filteredData.findLastIndex((day) => !day.isFuture);
    return filteredData.map((day, index) => {
      const value = day[activeSerie];
      return {
        date: day.date,
        valorReal: index <= lastRealIndex ? value : null,
        valorPrevisto: lastRealIndex === -1 || index >= lastRealIndex ? value : null,
      };
    });
  }, [filteredData, activeSerie]);

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
        <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full px-2 pt-2">
          <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatAxisDate}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={56}
              tickFormatter={(value) => formatMoneyCompact(Number(value))}
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
              dataKey="valorReal"
              name={chartConfig[activeSerie].label}
              type="monotone"
              stroke={chartConfig[activeSerie].color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="valorPrevisto"
              name={chartConfig[activeSerie].label}
              type="monotone"
              stroke={chartConfig[activeSerie].color}
              strokeWidth={2}
              isAnimationActive={false}
              strokeDasharray="5 5"
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
