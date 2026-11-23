"use client"

import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { Money } from "@/components/overview/hide-values"
import { useOrgPath } from "@/hooks/use-org-path"

/** More than this and the card would outgrow the chart beside it — the link covers the rest. */
const VISIBLE_ACCOUNTS = 5

export function BalanceCard({
  accounts,
  className,
}: {
  accounts: { id: string; name: string; balance: number }[]
  className?: string
}) {
  const toOrg = useOrgPath()
  const total = accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div className={`flex flex-col rounded-xl border bg-card px-4 pt-3.5 pb-3 ${className ?? ""}`}>
      <span className="text-[12.5px] text-muted-foreground">Saldo atual</span>
      <p className="mt-1 mb-3 text-[28px] leading-tight font-semibold tracking-[-0.015em] tabular-nums whitespace-nowrap">
        <Money cents={total} />
      </p>

      {accounts.length === 0 ? (
        <p className="flex min-h-10 items-center border-t text-[13px] text-muted-foreground">Nenhuma conta ativa</p>
      ) : (
        accounts.slice(0, VISIBLE_ACCOUNTS).map((account) => (
          <div key={account.id} className="flex min-h-10 items-center justify-between gap-3 border-t text-[13px]">
            <span className="min-w-0 truncate">{account.name}</span>
            <span className="shrink-0 font-medium tabular-nums whitespace-nowrap">
              <Money cents={account.balance} />
            </span>
          </div>
        ))
      )}

      <div className="mt-auto border-t pt-3">
        <Link
          href={toOrg("/accounts")}
          className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Ver todas as contas
          <ChevronRightIcon className="size-3.5" />
        </Link>
      </div>
    </div>
  )
}
