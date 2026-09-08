"use client"

import * as React from "react"
import { PencilIcon } from "lucide-react"

import { renameCategoryAction } from "@/app/(app)/categories/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function EditCategoryDialog({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const result = await renameCategoryAction(id, new FormData(event.currentTarget))

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-xs" />}>
        <PencilIcon />
        <span className="sr-only">Editar</span>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Renomear categoria</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${id}`}>Nome</Label>
              <Input id={`name-${id}`} name="name" defaultValue={name} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

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
