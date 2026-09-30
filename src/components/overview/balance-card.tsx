"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDownIcon } from "lucide-react"

import { Money } from "@/components/overview/hide-values"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export function BalanceCard({ accounts }: { accounts: { id: string; name: string; balance: number }[] }) {
  const cardRef = React.useRef<HTMLDivElement>(null)
  const [open, setOpen] = React.useState(false)
  const total = accounts.reduce((sum, account) => sum + account.balance, 0)

  return (
    <div ref={cardRef} className="flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] text-muted-foreground">Saldo atual</span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="group -mr-1.5 inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-accent">
            {accounts.length} {accounts.length === 1 ? "conta" : "contas"}
            <ChevronDownIcon className="size-3.5 transition-transform duration-150 group-data-popup-open:rotate-180" />
          </PopoverTrigger>
          <PopoverContent
            anchor={cardRef}
            align="start"
            sideOffset={6}
            backdrop
            className="w-(--anchor-width) gap-0 rounded-lg border bg-popover p-0 shadow-[0_10px_30px_rgba(0,0,0,.12)] ring-0 duration-[120ms] data-open:[--tw-enter-scale:1]! data-closed:[--tw-exit-scale:1]! data-[side=bottom]:slide-in-from-top-1"
          >
            <div className="flex items-center justify-between gap-3 border-b px-3.5 pt-3 pb-2.5">
              <span className="text-[13px] font-semibold">Contas bancárias</span>
              <Link
                href="/reconciliation"
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-primary hover:underline"
              >
                Ver todas →
              </Link>
            </div>
            <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-[200px]">
              <div className="px-3.5">
                {accounts.length === 0 && (
                  <p className="flex h-10 items-center text-[13px] text-muted-foreground">Nenhuma conta ativa</p>
                )}
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex h-10 items-center justify-between gap-3 text-[13px] not-first:border-t"
                  >
                    <span className="min-w-0 truncate">{account.name}</span>
                    <span className="shrink-0 font-medium tabular-nums whitespace-nowrap">
                      <Money cents={account.balance} />
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[22px] leading-tight font-semibold tracking-[-0.01em] tabular-nums whitespace-nowrap">
        <Money cents={total} />
      </p>
    </div>
  )
}
