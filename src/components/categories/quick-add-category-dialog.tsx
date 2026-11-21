"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { createQuickCategoryAction } from "@/app/o/[orgId]/(app)/categories/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category, CategoryType } from "@/modules/categories/types"

const NEW_GROUP = "__new__"
const typeNoun: Record<CategoryType, string> = { INCOME: "receita", EXPENSE: "despesa" }

/**
 * Quick-add a categoria without leaving the form that needs it. It goes
 * inside an existing grupo, or inside a new grupo created along with it —
 * so an organization with no grupos yet isn't stuck. The type comes from
 * the form (a venda takes a receita category, a despesa a despesa one).
 */
export function QuickAddCategoryDialog({
  categories,
  type,
  onCreated,
}: {
  categories: Category[]
  type: CategoryType
  /** `group` is set when a new grupo was created along with the categoria. */
  onCreated: (category: Category, group: Category | null) => void
}) {
  const groups = categories.filter((category) => !category.parentId && category.type === type)
  const [open, setOpen] = React.useState(false)
  const [groupId, setGroupId] = React.useState("")
  const [errors, setErrors] = React.useState<{ group?: string; name?: string; form?: string }>({})
  const [pending, setPending] = React.useState(false)

  // With no grupo of this type there's nothing to pick: create one.
  const creatingGroup = groups.length === 0 || groupId === NEW_GROUP

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setGroupId("")
      setErrors({})
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    // The dialog sits inside the sheet's form tree; keep its submit to itself.
    event.preventDefault()
    event.stopPropagation()

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const groupName = String(form.get("groupName") ?? "").trim()
    const name = String(form.get("name") ?? "").trim()

    const nextErrors: typeof errors = {}
    if (creatingGroup && !groupName) nextErrors.group = "Dê um nome ao grupo."
    if (!creatingGroup && !groupId) nextErrors.group = "Escolha o grupo."
    if (!name) nextErrors.name = "Informe o nome da categoria."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    form.set("type", type)
    if (creatingGroup) form.delete("groupId")
    else {
      form.set("groupId", groupId)
      form.delete("groupName")
    }

    setPending(true)
    const result = await createQuickCategoryAction(form)
    setPending(false)

    if (!result.ok) {
      if (result.field === "groupName" || result.field === "groupId") setErrors({ group: result.error })
      else if (result.field === "name") setErrors({ name: result.error })
      else setErrors({ form: result.error })
      return
    }

    setOpen(false)
    onCreated(result.data.category, result.data.group)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" className="w-full justify-start" />}>
        <PlusIcon />
        Nova categoria
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Nova categoria de {typeNoun[type]}</DialogTitle>
            {groups.length === 0 && (
              <DialogDescription>
                Você ainda não tem grupos de {typeNoun[type]}. Crie o primeiro junto com a categoria.
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-3 py-3">
            {groups.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="quick-category-group">Grupo</Label>
                <Select value={groupId} onValueChange={(value) => value && setGroupId(value)}>
                  <SelectTrigger id="quick-category-group" className="w-full" aria-invalid={errors.group && !creatingGroup ? true : undefined}>
                    <SelectValue>
                      {(value: string) =>
                        value === NEW_GROUP
                          ? "Novo grupo"
                          : (groups.find((group) => group.id === value)?.name ?? (
                              <span className="text-muted-foreground">Selecione o grupo</span>
                            ))
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                    <SelectSeparator />
                    <SelectItem value={NEW_GROUP}>
                      <PlusIcon />
                      Novo grupo
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.group && !creatingGroup && <p className="text-xs text-destructive">{errors.group}</p>}
              </div>
            )}

            {creatingGroup && (
              <div className="space-y-1.5">
                <Label htmlFor="quick-category-group-name">Nome do novo grupo</Label>
                <Input
                  id="quick-category-group-name"
                  name="groupName"
                  placeholder={type === "INCOME" ? "Ex.: Serviços" : "Ex.: Tecnologia"}
                  autoFocus
                  aria-invalid={errors.group ? true : undefined}
                />
                {errors.group && <p className="text-xs text-destructive">{errors.group}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="quick-category-name">Nome da categoria</Label>
              <Input
                id="quick-category-name"
                name="name"
                placeholder={type === "INCOME" ? "Ex.: Consultoria" : "Ex.: Hospedagem"}
                autoFocus={!creatingGroup}
                aria-invalid={errors.name ? true : undefined}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
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
