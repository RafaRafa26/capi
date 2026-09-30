"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { getBankAccountStatementAction } from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { balanceAxisScale } from "@/lib/chart-scale"
import { cn } from "@/lib/utils"
import { formatBRL, formatCompactBRL, formatDate, formatDayMonth, formatMonthYear } from "@/lib/format"
import type { BankAccountOverview, BankAccountStatement } from "@/modules/bank-accounts/types"
import { useOrgPath } from "@/hooks/use-org-path"

const chartConfig = {
  saldo: { label: "Saldo", color: "var(--chart-1)" },
  entradas: { label: "Entradas", color: "var(--color-emerald-500)" },
  saidas: { label: "Saídas", color: "var(--color-red-500)" },
} satisfies ChartConfig

type ChartSeries = keyof typeof chartConfig

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function isSameMonth(date: Date, month: Date): boolean {
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
}

/** Referência compacta pro eixo Y do gráfico (10k, 1,2M) — o valor exato já aparece no tooltip. */
export function BankAccountsWorkspace({
  accounts,
  initialStatement,
}: {
  accounts: BankAccountOverview[]
  initialStatement: BankAccountStatement | null
}) {
  const toOrg = useOrgPath()
  const [selectedId, setSelectedId] = React.useState(accounts[0]?.id ?? "")
  const [statement, setStatement] = React.useState<BankAccountStatement | null>(initialStatement)
  const [loading, setLoading] = React.useState(false)
  const [activeSeries, setActiveSeries] = React.useState<ChartSeries>("saldo")
  const [selectedMonth, setSelectedMonth] = React.useState(() => startOfMonth(new Date()))
  const loadedForAccount = React.useRef(accounts[0]?.id ?? "")

  const selectedAccount = React.useMemo(() => accounts.find((a) => a.id === selectedId) ?? null, [accounts, selectedId])

  function selectAccount(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    if (loadedForAccount.current === id) return
    setLoading(true)
    getBankAccountStatementAction(id).then((response) => {
      if (response.ok) {
        setStatement(response.data)
        loadedForAccount.current = id
      }
      setLoading(false)
    })
  }

  function shiftMonth(delta: number) {
    setSelectedMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const filteredLines = React.useMemo(() => {
    const lines = statement?.lines ?? []
    return lines.filter((line) => isSameMonth(line.date, selectedMonth))
  }, [statement, selectedMonth])

  const periodTotals = React.useMemo(() => {
    let entradas = 0
    let saidas = 0
    for (const line of filteredLines) {
      if (line.amount > 0) entradas += line.amount
      else saidas += -line.amount
    }
    return { entradas, saidas }
  }, [filteredLines])

  // Um ponto por dia do mês selecionado — não só nos dias com transação — com
  // o saldo já refletindo as movimentações daquele dia. Dias sem transação
  // carregam o saldo do dia anterior (linha reta), começando do saldo
  // acumulado até a véspera do mês (não só o que aconteceu dentro dele).
  const chartData = React.useMemo(() => {
    if (!selectedAccount) return []
    const allLines = statement?.lines ?? []

    let carry = selectedAccount.initialBalance
    for (const line of allLines) {
      if (line.date >= selectedMonth) break
      carry = line.runningBalance
    }

    const byDay = new Map<number, { entradas: number; saidas: number; delta: number }>()
    for (const line of filteredLines) {
      const day = line.date.getDate()
      const info = byDay.get(day) ?? { entradas: 0, saidas: 0, delta: 0 }
      info.delta += line.amount
      if (line.amount > 0) info.entradas += line.amount
      else info.saidas += -line.amount
      byDay.set(day, info)
    }

    const points = []
    let running = carry
    for (let day = 1; day <= daysInMonth(selectedMonth); day++) {
      const info = byDay.get(day)
      if (info) running += info.delta
      points.push({
        date: new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toISOString().slice(0, 10),
        saldo: running,
        entradas: info?.entradas ?? 0,
        saidas: info?.saidas ?? 0,
      })
    }
    return points
  }, [statement, filteredLines, selectedAccount, selectedMonth])

  const seriesTotals: Record<ChartSeries, number> = {
    saldo: chartData[chartData.length - 1]?.saldo ?? selectedAccount?.currentBalance ?? 0,
    entradas: periodTotals.entradas,
    saidas: periodTotals.saidas,
  }

  // Ticks redondos (5k, 10k, 20k...) e a linha perto do meio do gráfico,
  // com referências acima e abaixo — mesma escala da Visão geral.
  const yScale = React.useMemo(
    () => balanceAxisScale(chartData.map((point) => point[activeSeries] as number)),
    [chartData, activeSeries],
  )

  return (
    <div className="flex w-full flex-1">
      {/* O <aside> estica junto com a página só pra borda acompanhar a altura
          total; quem fica preso na viewport é o wrapper sticky de dentro, que
          tem altura de conteúdo — é essa folga que faz o sticky não escorregar
          no fim da rolagem. */}
      <aside className="w-72 shrink-0 border-r">
        <div className="sticky top-16 flex max-h-[calc(100svh-6rem)] flex-col gap-1 overflow-y-auto p-3">
          <p className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Contas bancárias</p>
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => selectAccount(account.id)}
              className={cn(
                "flex shrink-0 flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/50",
                selectedId === account.id && "bg-muted",
              )}
            >
              <span className="truncate text-sm font-medium">{account.name}</span>
              <span className="text-sm font-semibold">{formatBRL(account.currentBalance)}</span>
              {account.pendingCount > 0 && (
                <span className="text-xs text-amber-600">
                  {account.pendingCount} {account.pendingCount === 1 ? "conciliação pendente" : "conciliações pendentes"}
                </span>
              )}
            </button>
          ))}
          {accounts.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhuma conta cadastrada ainda.</p>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        {!selectedAccount ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cadastre uma conta bancária para começar.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{selectedAccount.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAccount.bank} · Ag {selectedAccount.branchNumber} / CC {selectedAccount.accountNumber}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)}>
                  <ChevronLeftIcon />
                </Button>
                <span className="w-36 text-center text-sm font-medium capitalize">{formatMonthYear(selectedMonth)}</span>
                <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)}>
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <Card className="py-0">
                  <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
                      <CardTitle>Movimentação</CardTitle>
                      <CardDescription className="capitalize">Saldo dia a dia em {formatMonthYear(selectedMonth)}</CardDescription>
                    </div>
                    <div className="flex">
                      {(Object.keys(chartConfig) as ChartSeries[]).map((key) => (
                        <button
                          key={key}
                          type="button"
                          data-active={activeSeries === key}
                          className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                          onClick={() => setActiveSeries(key)}
                        >
                          <span className="text-xs text-muted-foreground">{chartConfig[key].label}</span>
                          <span className="text-lg leading-none font-bold sm:text-2xl">{formatBRL(seriesTotals[key])}</span>
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 sm:p-6">
                    <ChartContainer config={chartConfig} className="aspect-auto h-62.5 w-full">
                      <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                          tickFormatter={(value) => formatDayMonth(new Date(value))}
                        />
                        <YAxis
                          domain={yScale.domain}
                          ticks={yScale.ticks}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          width={48}
                          tickFormatter={(value) => formatCompactBRL(value as number)}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              className="w-37.5"
                              nameKey={activeSeries}
                              labelFormatter={(value) => formatDate(new Date(value))}
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
                  </CardContent>
                </Card>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button nativeButton={false} render={<Link href={toOrg(`/reconciliation/${selectedAccount.id}`)} />}>
                    Conciliar
                  </Button>
                  <Button variant="outline">Novo registro</Button>
                </div>

                <div className="rounded-lg border">
                  <div className="grid grid-cols-[120px_1fr_140px_140px] gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground">
                    <div>Data</div>
                    <div>Descrição</div>
                    <div className="text-right">Valor</div>
                    <div className="text-right">Saldo</div>
                  </div>
                  <div className="divide-y">
                    {[...filteredLines].reverse().map((line) => (
                      <div key={line.bankTransactionId} className="grid grid-cols-[120px_1fr_140px_140px] items-center gap-4 px-4 py-3">
                        <div className="text-sm text-muted-foreground">{formatDate(line.date)}</div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{line.description}</p>
                          {line.settledEntries.length > 0 && (
                            <p className="truncate text-xs text-muted-foreground">
                              {line.settledEntries.map((entry) => `${entry.contactName} — ${entry.description}`).join(" · ")}
                            </p>
                          )}
                        </div>
                        <div className={cn("text-right text-sm font-semibold", line.amount >= 0 ? "text-emerald-500" : "text-red-500")}>
                          {line.amount >= 0 ? "" : "- "}
                          {formatBRL(Math.abs(line.amount))}
                        </div>
                        <div className="text-right text-sm font-medium">{formatBRL(line.runningBalance)}</div>
                      </div>
                    ))}
                    {filteredLines.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma transação conciliada neste mês.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
