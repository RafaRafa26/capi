"use client"

import * as React from "react"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { deleteMarkerAction } from "@/app/o/[orgId]/(app)/markers/actions"
import { MarkerDialog } from "@/components/markers/marker-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { markerBadgeStyle } from "@/lib/marker-colors"
import type { Marker, MarkerType } from "@/modules/markers/types"

const sections: { type: MarkerType; title: string; description: string }[] = [
  {
    type: "RECEIVABLE",
    title: "Contas a receber",
    description: "Status da cobrança — aparecem na listagem e nos relatórios de contas a receber.",
  },
  {
    type: "PAYABLE",
    title: "Contas a pagar",
    description: "Aparecem na listagem e nos relatórios de contas a pagar.",
  },
]

export function MarkersView({ markers }: { markers: Marker[] }) {
  const [dialog, setDialog] = React.useState<{ type: MarkerType; marker: Marker | null } | null>(null)
  const [deleting, setDeleting] = React.useState<Marker | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  async function confirmDelete() {
    if (!deleting) return
    setDeleteError(null)
    setDeletePending(true)
    const result = await deleteMarkerAction(deleting.id)
    setDeletePending(false)
    if (!result.ok) {
      setDeleteError(result.error)
      return
    }
    setDeleting(null)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {sections.map((section) => {
        const sectionMarkers = markers.filter((marker) => marker.type === section.type)
        return (
          <div key={section.type} className="flex flex-col gap-2">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium">{section.title}</h3>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDialog({ type: section.type, marker: null })}>
                <PlusIcon />
                Novo marcador
              </Button>
            </div>

            <Card>
              <CardContent className="flex flex-col divide-y py-0">
                {sectionMarkers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum marcador cadastrado ainda.</p>
                ) : (
                  sectionMarkers.map((marker) => (
                    <div key={marker.id} className="flex items-center justify-between gap-2 py-2.5">
                      <span
                        className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium"
                        style={markerBadgeStyle(marker.color)}
                      >
                        {marker.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Editar ${marker.name}`}
                          onClick={() => setDialog({ type: section.type, marker })}
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Excluir ${marker.name}`}
                          onClick={() => {
                            setDeleteError(null)
                            setDeleting(marker)
                          }}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )
      })}

      <MarkerDialog
        type={dialog?.type ?? "RECEIVABLE"}
        marker={dialog?.marker ?? null}
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
      />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir marcador</DialogTitle>
            <DialogDescription>
              Os lançamentos marcados com “{deleting?.name}” ficarão sem marcador. As observações deles são mantidas.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deletePending}>
              {deletePending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
