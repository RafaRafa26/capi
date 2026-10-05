"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"

import { createMarkerAction, updateMarkerAction } from "@/app/o/[orgId]/(app)/markers/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MARKER_COLORS, markerBadgeStyle, markerColorLabel, markerDotColor, type MarkerColor } from "@/lib/marker-colors"
import { cn } from "@/lib/utils"
import type { Marker, MarkerType } from "@/modules/markers/types"

/** Cria um marcador (sem `marker`) ou edita nome e cor de um existente. */
export function MarkerDialog({
  type,
  marker,
  open,
  onOpenChange,
}: {
  type: MarkerType
  marker: Marker | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState<MarkerColor>("gray")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // Reset on every opening — "adjust state during render", as in
  // entry-notes-dialog.tsx.
  const openedKey = open ? (marker?.id ?? "new") : null
  const [loadedKey, setLoadedKey] = React.useState<string | null>(null)
  if (openedKey !== loadedKey) {
    setLoadedKey(openedKey)
    if (openedKey) {
      setName(marker?.name ?? "")
      setColor(marker?.color ?? "gray")
      setError(null)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = marker
      ? await updateMarkerAction(marker.id, { name, color })
      : await createMarkerAction({ type, name, color })
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{marker ? "Editar marcador" : "Novo marcador"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="marker-name">Nome</Label>
            <Input
              id="marker-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              placeholder={type === "RECEIVABLE" ? "Ex.: Cobrado, sem retorno" : "Ex.: Aguardando nota fiscal"}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cor</Label>
            <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
              {MARKER_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={color === option}
                  aria-label={markerColorLabel[option]}
                  title={markerColorLabel[option]}
                  onClick={() => setColor(option)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-shadow",
                    color === option && "ring-2 ring-foreground/60",
                  )}
                  style={{ backgroundColor: markerDotColor(option) }}
                >
                  {color === option && <CheckIcon className="size-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Prévia:
            <span
              className="inline-flex h-5.5 items-center rounded-full px-2 text-xs font-medium"
              style={markerBadgeStyle(color)}
            >
              {name.trim() || "Marcador"}
            </span>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
