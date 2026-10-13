"use client"

import * as React from "react"
import { ArrowDownIcon, ArrowUpIcon, CircleCheckIcon, CornerDownRightIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { deleteTransferAction, getTransferAction } from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TransferDetail } from "@/modules/settlements/types"

/**
 * Painel de uma transferência entre contas próprias (RN-15), aberto pelo
 * extrato: as duas pernas com a conta, origem/destino, valor e se já foram
 * conciliadas. A lixeira exclui a transferência nas duas contas.
 */
export function TransferSheet({
  entryId,
  onOpenChange,
  onDeleted,
}: {
  // Qualquer uma das duas pernas; nulo fecha o painel.
  entryId: string | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}) {
  // Guardado junto com o id que o pediu: trocar de transferência mostra
  // "Carregando..." em vez dos dados da anterior.
  const [loaded, setLoaded] = React.useState<{ entryId: string; transfer?: TransferDetail; error?: string } | null>(null)
  const [confirmingDelete, setConfirmingDelete] = React.useState(false)
  const [deletePending, setDeletePending] = React.useState(false)

  React.useEffect(() => {
    if (!entryId) return
    let cancelled = false
    getTransferAction(entryId).then((response) => {
      if (cancelled) return
      setLoaded(response.ok ? { entryId, transfer: response.data } : { entryId, error: response.error })
    })
    return () => {
      cancelled = true
    }
  }, [entryId])

  const current = loaded?.entryId === entryId ? loaded : null
  const transfer = current?.transfer ?? null
  const error = current?.error ?? null

  async function confirmDelete() {
    if (!entryId) return
    setDeletePending(true)
    const result = await deleteTransferAction(entryId)
    setDeletePending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Transferência excluída.")
    setConfirmingDelete(false)
    onDeleted()
  }

  const hasReconciledLeg = transfer?.legs.some((leg) => leg.reconciled) ?? false

  return (
    <>
      <Sheet open={entryId !== null} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          overlayClassName="bg-black/45"
          initialFocus={false}
          className="flex h-full w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-150"
        >
          <SheetHeader className="flex-row items-center gap-2 border-b p-4 pr-12">
            <SheetTitle className="flex-1 text-base font-semibold">Transferência</SheetTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Excluir transferência"
              title="Excluir transferência"
              disabled={!transfer}
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2Icon />
            </Button>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!transfer && !error && <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>}
            {transfer && (
              <>
                <p className="text-[13px] text-muted-foreground">{transfer.description}</p>
                <div className="rounded-lg border">
                  <div className="grid grid-cols-[110px_1fr_100px_120px_20px] gap-3 border-b bg-muted/50 px-4 py-2.5 text-sm font-medium text-muted-foreground">
                    <div>Data</div>
                    <div>Conta</div>
                    <div>Tipo</div>
                    <div className="text-right">Valor</div>
                    <div />
                  </div>
                  <div className="divide-y">
                    {transfer.legs.map((leg) => (
                      <div key={leg.entryId} className="px-4 py-3">
                        <div className="grid grid-cols-[110px_1fr_100px_120px_20px] items-center gap-3 text-sm">
                          <div className="text-muted-foreground">{formatDate(leg.date)}</div>
                          <div className="truncate">{leg.bankAccountName}</div>
                          <div className="flex items-center gap-1">
                            {leg.direction === "OUT" ? (
                              <ArrowDownIcon className="size-4 text-red-500" />
                            ) : (
                              <ArrowUpIcon className="size-4 text-emerald-500" />
                            )}
                            {leg.direction === "OUT" ? "Origem" : "Destino"}
                          </div>
                          <div className={cn("text-right font-medium", leg.amount < 0 && "text-red-500")}>
                            {leg.amount < 0 ? "- " : ""}
                            {formatBRL(Math.abs(leg.amount))}
                          </div>
                          <div>
                            {leg.reconciled && (
                              <CircleCheckIcon className="size-4 text-sky-600" aria-label="Conciliada">
                                <title>Conciliada</title>
                              </CircleCheckIcon>
                            )}
                          </div>
                        </div>
                        {/* A transação do extrato desta conta com que a perna foi conciliada. */}
                        {leg.bankTransactions.map((bankTransaction) => (
                          <div
                            key={bankTransaction.id}
                            className="mt-2 flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
                          >
                            <CornerDownRightIcon className="mt-px size-3.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium tracking-wide uppercase">Conciliada com</p>
                              <p className="wrap-break-word text-foreground">{bankTransaction.description}</p>
                            </div>
                            <span className="shrink-0">{formatDate(bankTransaction.date)}</span>
                            <span className={cn("shrink-0 font-medium", bankTransaction.amount < 0 ? "text-red-500" : "text-foreground")}>
                              {bankTransaction.amount < 0 ? "- " : ""}
                              {formatBRL(Math.abs(bankTransaction.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmingDelete} onOpenChange={(open) => !open && !deletePending && setConfirmingDelete(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir transferência?</DialogTitle>
            <DialogDescription>
              A transferência sai do extrato das duas contas
              {hasReconciledLeg ? ", e a transação conciliada volta para a tela de conciliação." : "."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmingDelete(false)} disabled={deletePending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
