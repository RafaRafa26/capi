"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateEntryNotesAction } from "@/components/accounts/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { kindConfig } from "@/lib/accounts/labels"
import { formatBRL, formatDate } from "@/lib/format"
import { markerBadgeStyle, markerDotColor } from "@/lib/marker-colors"
import { cn } from "@/lib/utils"
import type { AccountEntry, LedgerKind } from "@/modules/accounts/types"
import type { Marker } from "@/modules/markers/types"
import { useOrgPath } from "@/hooks/use-org-path"

function formatDateTime(date: Date): string {
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${formatDate(date)} às ${time}`
}

/**
 * Marcador + observação de um lançamento (RN-36), aberto pelo botão da
 * listagem — registrar um retorno de cobrança sem abrir o lançamento.
 */
export function EntryNotesDialog({
  entry,
  kind,
  markers,
  open,
  onOpenChange,
}: {
  entry: AccountEntry | null
  kind: LedgerKind
  // Só os do lado desta tela (a receber ou a pagar).
  markers: Marker[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const toOrg = useOrgPath()
  const [markerId, setMarkerId] = React.useState<string | null>(null)
  const [notes, setNotes] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // Same "adjust state during render" reset as account-entry-dialog.tsx, but
  // keyed on every opening too — reopening the same lançamento after
  // Cancelar must show what's saved, not the abandoned draft.
  const openedEntryId = open && entry ? entry.id : null
  const [loadedEntryId, setLoadedEntryId] = React.useState<string | null>(null)
  if (openedEntryId !== loadedEntryId) {
    setLoadedEntryId(openedEntryId)
    if (entry && openedEntryId) {
      setMarkerId(entry.marker?.id ?? null)
      setNotes(entry.notes ?? "")
      setError(null)
    }
  }

  if (!entry) return null

  const title = entry.installment ? `${entry.installment} - ${entry.description}` : entry.description
  const remaining = Math.max(0, entry.amount - entry.settledAmount)

  async function save() {
    if (!entry || pending) return
    setError(null)
    setPending(true)
    const result = await updateEntryNotesAction(entry.id, { markerId, notes })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success("Acompanhamento salvo.")
    onOpenChange(false)
    router.refresh()
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void save()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Acompanhamento</DialogTitle>
            <DialogDescription>
              {title} · {entry.contactName} · vence {formatDate(entry.dueDate)} ·{" "}
              {kindConfig[kind].amountColumnLabel.toLowerCase()} {formatBRL(remaining)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Marcador</Label>
              <Link
                href={toOrg("/markers")}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Gerenciar marcadores
              </Link>
            </div>
            <div role="radiogroup" aria-label="Marcador" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={markerId === null}
                onClick={() => setMarkerId(null)}
                className={cn(
                  "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
                  markerId === null && "border-foreground/40 bg-muted text-foreground",
                )}
              >
                Sem marcador
              </button>
              {markers.map((marker) => {
                const selected = markerId === marker.id
                return (
                  <button
                    key={marker.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMarkerId(marker.id)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                      selected ? "border-current" : "border-transparent hover:border-border",
                    )}
                    style={selected ? markerBadgeStyle(marker.color) : undefined}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: markerDotColor(marker.color) }}
                    />
                    {marker.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="entry-notes">Observações</Label>
            <Textarea
              id="entry-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void save()
                }
              }}
              placeholder={
                kind === "rec"
                  ? "Ex.: Combinou pagamento para 02/09/26."
                  : "Ex.: Fornecedor vai reemitir o boleto."
              }
              maxLength={2000}
              className="max-h-60 min-h-28"
              autoFocus
            />
            {entry.notesUpdatedAt && (
              <p className="text-xs text-muted-foreground">Atualizado em {formatDateTime(entry.notesUpdatedAt)}</p>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
