"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { createCategoryAction } from "@/app/(app)/categories/actions"
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

export function NewSubcategoryDialog({ parentId }: { parentId: string }) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set("parentId", parentId)

    const result = await createCategoryAction(form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setOpen(false)
    event.currentTarget.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-xs" />}>
        <PlusIcon />
        <span className="sr-only">Nova subcategoria</span>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova subcategoria</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor={`subcategory-name-${parentId}`}>Nome</Label>
              <Input id={`subcategory-name-${parentId}`} name="name" required />
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
