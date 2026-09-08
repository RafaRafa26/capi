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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function NewCategoryDialog() {
  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("INCOME")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set("type", type)

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
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon />
        Nova categoria
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(value) => value && setType(value as "INCOME" | "EXPENSE")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: "INCOME" | "EXPENSE") => (value === "INCOME" ? "Receita" : "Despesa")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
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
