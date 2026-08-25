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
import { formatMoney, formatMoneyAxis } from "@/lib/format";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
export type PontoFluxoCaixa = { date: string; entradas: number; saidas: number };

const NEGATIVE_COLOR = "#e5484d";

// Algoritmo clássico de "nice numbers": arredonda o mínimo/máximo do eixo
// para valores redondos relativos à ordem de grandeza dos dados, em vez de
// sempre partir de zero — assim a linha não fica espremida no topo do
// gráfico, e a escala se estende para baixo sozinha quando há negativos.
//
// Geramos a lista de ticks nós mesmos (em vez de deixar o recharts calcular
// a partir do domain) porque o gerador padrão dele sempre inclui o limite
// exato do domain como último tick, mesmo quando isso não é múltiplo do
// step — o que produz espaçamento inconsistente entre os números do eixo.
function niceTicks(min: number, max: number, tickCount = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 100000];
  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 100000);
    min -= pad;
    max += pad;
  }

  const range = max - min;
  const rawStep = range / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;

  let step = magnitude;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;

  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;

  const ticks: number[] = [];
  for (let value = niceMin; value <= niceMax + step / 2; value += step) {
    ticks.push(value);
  }
  return ticks;
}

const chartConfig = {
  saldo: {
    label: "Saldo",
    color: "var(--foreground)",
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

export function CashFlowChart({ serie }: { serie: PontoFluxoCaixa[] }) {
  const [activeSerie, setActiveSerie] = useState<keyof typeof chartConfig>("saldo");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Saldo acumulado desde o início da série — não reinicia ao trocar o período
  // filtrado, para refletir um saldo de conta de verdade. Lançamentos com data
  // futura são projeção e a linha os desenha pontilhados.
  const hoje = useMemo(() => {
    const agora = new Date();
    return new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );
  }, []);

  const fluxoCaixaAcumulado = useMemo(() => {
    // Laço em vez de `map` com acumulador externo: o compilador do React
    // rejeita reatribuir variável capturada por callback durante o render.
    const acumulado: (PontoFluxoCaixa & { saldo: number; isFuture: boolean })[] = [];
    let saldo = 0;
    for (const day of serie) {
      saldo += day.entradas - day.saidas;
      acumulado.push({
        ...day,
        saldo,
        isFuture: new Date(`${day.date}T00:00:00Z`) > hoje,
      });
    }
    return acumulado;
  }, [serie, hoje]);

  const filteredData = useMemo(() => {
    if (!dateRange?.from) return fluxoCaixaAcumulado;
    const from = dateRange.from.getTime();
    const to = (dateRange.to ?? dateRange.from).getTime();
    return fluxoCaixaAcumulado.filter((day) => {
      const time = new Date(`${day.date}T00:00:00`).getTime();
      return time >= from && time <= to;
    });
  }, [dateRange, fluxoCaixaAcumulado]);

  const totals = useMemo(() => {
    const entradas = filteredData.reduce((sum, day) => sum + day.entradas, 0);
    const saidas = filteredData.reduce((sum, day) => sum + day.saidas, 0);
    const saldo = filteredData.at(-1)?.saldo ?? 0;
    return { entradas, saidas, saldo };
  }, [filteredData]);

  const isNegativeSaldo = activeSerie === "saldo" && totals.saldo < 0;
  const lineColor = isNegativeSaldo ? NEGATIVE_COLOR : chartConfig[activeSerie].color;

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

  const yTicks = useMemo(() => {
    const values = filteredData.map((day) => day[activeSerie]);
    return niceTicks(Math.min(...values), Math.max(...values));
  }, [filteredData, activeSerie]);
  const yDomain = useMemo<[number, number]>(
    () => [yTicks[0], yTicks[yTicks.length - 1]],
    [yTicks],
  );

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
              width={82}
              domain={yDomain}
              ticks={yTicks}
              tickFormatter={(value) => formatMoneyAxis(Number(value))}
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
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="valorPrevisto"
              name={chartConfig[activeSerie].label}
              type="monotone"
              stroke={lineColor}
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
