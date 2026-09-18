"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { createQuickContactAction } from "@/app/(app)/contacts/actions"
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
import type { Contact, ContactType } from "@/modules/contacts/types"

/**
 * Quick-add a contact without leaving the new-sale/new-expense form — name
 * only, of a fixed `contactType` decided by the caller. The contact starts
 * without a document; it can be completed later on the Contacts screen.
 */
export function QuickAddContactDialog({
  contactType,
  triggerLabel,
  dialogTitle,
  onCreated,
}: {
  contactType: ContactType
  triggerLabel: string
  dialogTitle: string
  onCreated: (contact: Contact) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(event.currentTarget)
    form.set("contactType", contactType)
    const result = await createQuickContactAction(form)

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
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="quick-contact-name">Nome</Label>
              <Input id="quick-contact-name" name="name" autoFocus required />
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
