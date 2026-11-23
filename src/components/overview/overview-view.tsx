"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon } from "lucide-react"

import { BalanceCard } from "@/components/overview/balance-card"
import { FlowChartCard } from "@/components/overview/flow-chart-card"
import { Money } from "@/components/overview/hide-values"
import {
  overviewBalanceClassName,
  overviewChartClassName,
  overviewGridClassName,
} from "@/components/overview/layout"
import type { LancamentoBucketKey, ResumoLancamentos } from "@/modules/dashboard/domain"
import type { OverviewData } from "@/modules/dashboard/service"
import { useOrgPath } from "@/hooks/use-org-path"

const RED = "var(--negative)"
const AMBER = "var(--warning)"
const GRAY = "var(--muted-foreground)"

// Each link spells out its whole query, so the accounts screen opens clean:
// no search, no chips, page 1.
const OVERDUE_QUERY = "card=OVERDUE&period=all"
const DUE_TODAY_QUERY = "card=DUE_TODAY&period=today"
const UPCOMING_QUERY = "card=UPCOMING&period=all"

const rowClassName =
  "-mx-2 grid min-h-10 items-center gap-2.5 border-t px-2 text-[13px] transition-colors outline-none hover:bg-muted focus-visible:bg-muted"

function Dot({ color }: { color: string }) {
  return <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
}

const bands: { key: LancamentoBucketKey; label: string; dot: string; valueColor?: string; query: string }[] = [
  { key: "vencido", label: "Vencidas", dot: RED, valueColor: RED, query: OVERDUE_QUERY },
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
        <span className="ml-auto tabular-nums whitespace-nowrap">
          <Money cents={summary.total} />
        </span>
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
            <span className="text-[12.5px] whitespace-nowrap text-muted-foreground tabular-nums">
              {bucket.count} {bucket.count === 1 ? "conta" : "contas"}
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
  const currentBalance = data.accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className={overviewGridClassName}>
      <BalanceCard className={overviewBalanceClassName} accounts={data.accounts} />

      <FlowChartCard
        className={overviewChartClassName}
        currentBalance={currentBalance}
        realizedByDay={data.realizedByDay}
        forecastByDay={data.forecastByDay}
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
