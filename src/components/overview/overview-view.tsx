"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon, CircleCheckIcon } from "lucide-react"

import { BalanceCard } from "@/components/overview/balance-card"
import { FlowChartCard } from "@/components/overview/flow-chart-card"
import { Money } from "@/components/overview/hide-values"
import { overviewChartClassName, overviewGridClassName } from "@/components/overview/layout"
import type { LancamentoBucketKey, ResumoLancamentos } from "@/modules/dashboard/domain"
import type { OverviewData } from "@/modules/dashboard/service"
import { useOrgPath } from "@/hooks/use-org-path"

const RED = "oklch(0.63 0.24 25)"
const AMBER = "oklch(0.77 0.16 70)"
const BLUE = "oklch(0.6 0.15 255)"
const GREEN = "oklch(0.62 0.17 149)"
const GRAY = "oklch(0.7 0 0)"

// Each link spells out its whole query, so the accounts screen opens clean:
// no search, no chips, page 1.
const OVERDUE_QUERY = "card=OVERDUE&period=all"
const DUE_TODAY_QUERY = "card=DUE_TODAY&period=today"
const UPCOMING_QUERY = "card=UPCOMING&period=all"

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

interface AttentionItem {
  color: string
  text: string
  href: string
}

function attentionItems(data: OverviewData): AttentionItem[] {
  const items: (AttentionItem & { count: number })[] = [
    {
      count: data.receivables.buckets.vencido.count,
      color: RED,
      text: plural(data.receivables.buckets.vencido.count, "conta a receber vencida", "contas a receber vencidas"),
      href: `/receivables?${OVERDUE_QUERY}`,
    },
    {
      count: data.payables.buckets.vencido.count,
      color: RED,
      text: plural(data.payables.buckets.vencido.count, "conta a pagar vencida", "contas a pagar vencidas"),
      href: `/payables?${OVERDUE_QUERY}`,
    },
    {
      count: data.receivables.buckets.venceHoje.count,
      color: AMBER,
      text: plural(data.receivables.buckets.venceHoje.count, "recebimento vence hoje", "recebimentos vencem hoje"),
      href: `/receivables?${DUE_TODAY_QUERY}`,
    },
    {
      count: data.payables.buckets.venceHoje.count,
      color: AMBER,
      text: plural(data.payables.buckets.venceHoje.count, "pagamento vence hoje", "pagamentos vencem hoje"),
      href: `/payables?${DUE_TODAY_QUERY}`,
    },
    {
      count: data.pendingReconciliationCount,
      color: BLUE,
      text: plural(
        data.pendingReconciliationCount,
        "transação aguardando conciliação",
        "transações aguardando conciliação",
      ),
      href: "/accounts",
    },
    {
      count: data.beneficiariesWithBalanceCount,
      color: GREEN,
      text: plural(
        data.beneficiariesWithBalanceCount,
        "Favorecido possui saldo para repasse",
        "Favorecidos possuem saldo para repasse",
      ),
      href: "/payout?saldo=com-saldo",
    },
  ]
  return items.filter((item) => item.count > 0)
}

const rowClassName =
  "-mx-2 grid min-h-10 items-center gap-2.5 border-t px-2 text-[13px] transition-colors outline-none hover:bg-muted focus-visible:bg-muted"

function Dot({ color }: { color: string }) {
  return <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
}

function AttentionCard({ data }: { data: OverviewData }) {
  const toOrg = useOrgPath()
  const items = attentionItems(data)

  return (
    <div className="rounded-xl border bg-card px-4 pt-3.5 pb-2">
      <h2 className="mb-2 text-sm font-semibold">Pontos de atenção</h2>
      {items.length === 0 ? (
        <p className="flex min-h-[120px] items-center justify-center gap-2 border-t text-sm text-muted-foreground">
          <CircleCheckIcon className="size-4" />
          Tudo em dia
        </p>
      ) : (
        items.map((item) => (
          <Link key={item.href} href={toOrg(item.href)} className={`${rowClassName} grid-cols-[8px_1fr_16px]`}>
            <Dot color={item.color} />
            <span className="truncate">{item.text}</span>
            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          </Link>
        ))
      )}
    </div>
  )
}

const bands: { key: LancamentoBucketKey; label: string; dot: string; valueColor?: string; query: string }[] = [
  { key: "vencido", label: "Vencidas", dot: RED, valueColor: "oklch(0.55 0.22 25)", query: OVERDUE_QUERY },
  { key: "venceHoje", label: "Vencem hoje", dot: AMBER, query: DUE_TODAY_QUERY },
  { key: "aVencer", label: "A vencer", dot: GRAY, query: UPCOMING_QUERY },
]

function AccountsBucketCard({
  title,
  icon,
  summary,
  basePath,
  className,
}: {
  title: string
  icon: React.ReactNode
  summary: ResumoLancamentos
  basePath: string
  className?: string
}) {
  const toOrg = useOrgPath()
  return (
    <div className={`rounded-xl border bg-card px-4 pt-3.5 pb-2 ${className ?? ""}`}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h2>
      {bands.map((band) => {
        const bucket = summary.buckets[band.key]
        return (
          <Link
            key={band.key}
            href={toOrg(`${basePath}?${band.query}`)}
            className={`${rowClassName} grid-cols-[8px_1fr_auto_auto_16px]`}
          >
            <Dot color={band.dot} />
            <span className="truncate">{band.label}</span>
            <span className="rounded-full bg-muted px-[7px] py-px text-[11.5px] text-muted-foreground tabular-nums">
              {bucket.count}
            </span>
            <span
              className="min-w-24 text-right font-medium tabular-nums whitespace-nowrap"
              style={{ color: band.valueColor ?? "var(--foreground)" }}
            >
              <Money cents={bucket.total} />
            </span>
            <ChevronRightIcon className="size-3.5 text-muted-foreground" />
          </Link>
        )
      })}
    </div>
  )
}

export function OverviewView({ data }: { data: OverviewData }) {
  const sideRef = React.useRef<HTMLDivElement>(null)
  const [sideHeight, setSideHeight] = React.useState<number>()

  // Stacked layout only (side by side it's pure CSS, see layout.ts): the chart
  // takes the side column's height. The accounts popover is portaled, so
  // opening it never changes this measurement.
  React.useLayoutEffect(() => {
    const element = sideRef.current
    if (!element) return
    const measure = () => setSideHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])

  const currentBalance = data.accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className={overviewGridClassName}>
      <div ref={sideRef} className="flex flex-col gap-4 [grid-area:side]">
        <BalanceCard accounts={data.accounts} />
        <AttentionCard data={data} />
      </div>

      <FlowChartCard
        className={overviewChartClassName}
        sideHeight={sideHeight}
        currentBalance={currentBalance}
        realizedByDay={data.realizedByDay}
      />

      <AccountsBucketCard
        className="[grid-area:rec]"
        title="Contas a receber"
        icon={<ArrowUpRightIcon className="size-4" />}
        summary={data.receivables}
        basePath="/receivables"
      />
      <AccountsBucketCard
        className="[grid-area:pay]"
        title="Contas a pagar"
        icon={<ArrowDownRightIcon className="size-4" />}
        summary={data.payables}
        basePath="/payables"
      />
    </div>
  )
}
