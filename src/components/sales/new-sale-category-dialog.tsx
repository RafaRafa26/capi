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
import type { Category, CategoryType } from "@/modules/categories/types"

const typeLabel: Record<CategoryType, string> = { INCOME: "Receita", EXPENSE: "Despesa" }

/**
 * Quick-add a subcategory without leaving the sale form. Always creates a
 * subcategory (never a top-level category) — the type selector only filters
 * which top-level categories are offered as the parent, since a subcategory
 * inherits its parent's type.
 */
export function NewSaleCategoryDialog({
  categories,
  onCreated,
}: {
  categories: Category[]
  onCreated: (category: Category) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState<CategoryType>("INCOME")
  const [parentId, setParentId] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const parentOptions = categories.filter((category) => !category.parentId && category.type === type)

  const [lastType, setLastType] = React.useState(type)
  if (type !== lastType) {
    setLastType(type)
    setParentId(parentOptions[0]?.id ?? "")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!parentId) {
      setError("Selecione a categoria pai.")
      return
    }

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
    onCreated(result.data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" className="w-full justify-start" />}>
        <PlusIcon />
        Nova categoria
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value) => value && setType(value as CategoryType)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: CategoryType) => typeLabel[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">Receita</SelectItem>
                  <SelectItem value="EXPENSE">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={parentId} onValueChange={(value) => value && setParentId(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {() => parentOptions.find((option) => option.id === parentId)?.name ?? "Selecione"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subcategory-name">Nome da subcategoria</Label>
              <Input id="subcategory-name" name="name" autoFocus required />
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
