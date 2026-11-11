"use client"

import * as React from "react"
import { ArrowLeftIcon } from "lucide-react"

import { listPayoutCreditsAction } from "@/app/o/[orgId]/(app)/payout/actions"
import { CreditSummary } from "@/components/payout/credit-summary"
import { Button } from "@/components/ui/button"
import { formatBRL } from "@/lib/format"
import type { BeneficiaryCredit } from "@/modules/payouts/types"

/**
 * Os recebimentos que compõem um repasse já gerado, dentro do detalhe do
 * lançamento — a mesma linha do diálogo "Gerar repasse", só que de leitura.
 * Montado só enquanto expandido, então carrega de novo a cada abertura.
 */
export function PayoutCreditsList({ entryId }: { entryId: string }) {
  const [credits, setCredits] = React.useState<BeneficiaryCredit[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let ignore = false
    listPayoutCreditsAction(entryId).then((response) => {
      if (ignore) return
      if (response.ok) setCredits(response.data)
      else setError(response.error)
    })
    return () => {
      ignore = true
    }
  }, [entryId])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (credits === null) return <p className="text-sm text-muted-foreground">Carregando...</p>
  if (credits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum recebimento ligado a este repasse — o recebimento pode ter sido desconciliado.
      </p>
    )
  }

  const total = credits.reduce((sum, credit) => sum + credit.amount, 0)
  return (
    <div className="rounded-lg border">
      <div className="divide-y">
        {credits.map((credit) => (
          <div key={credit.id} className="flex min-w-0 items-center gap-3 px-3 py-2.5 text-sm">
            <CreditSummary credit={credit} />
            <span className="shrink-0 font-medium">{formatBRL(credit.amount)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-3 py-2 text-sm">
        <span className="text-muted-foreground">
          {credits.length} {credits.length === 1 ? "recebimento" : "recebimentos"}
        </span>
        <span className="font-semibold">{formatBRL(total)}</span>
      </div>
    </div>
  )
}

/**
 * Painel que cobre o sheet de detalhe (precisa de um pai posicionado, como o
 * SheetContent, que é `fixed`) — em tela pequena fica do tamanho do sheet, em
 * vez de um diálogo solto no meio da tela.
 */
export function PayoutCreditsPanel({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  return (
    <div
      role="region"
      aria-label="Recebimentos do repasse"
      className="absolute inset-0 z-20 flex flex-col bg-popover animate-in duration-200 fade-in-0 slide-in-from-right-8"
    >
      <div className="flex items-center gap-2 border-b p-4">
        <Button variant="ghost" size="icon-sm" aria-label="Voltar ao lançamento" onClick={onClose}>
          <ArrowLeftIcon />
        </Button>
        <p className="text-base font-semibold">Recebimentos do repasse</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <PayoutCreditsList entryId={entryId} />
      </div>
    </div>
  )
}
