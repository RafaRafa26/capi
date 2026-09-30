"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createOrganizationAction } from "@/app/orgs/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { orgPath } from "@/lib/org-path"

export function NewOrganizationForm({ canCancel }: { canCancel: boolean }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)

    const result = await createOrganizationAction(new FormData(event.currentTarget))

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push(orgPath(result.data.id, "/dashboard"))
    router.refresh()
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome da empresa</Label>
        <Input id="name" name="name" autoComplete="organization" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="document">CNPJ ou CPF</Label>
        <Input id="document" name="document" inputMode="numeric" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {canCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? "Criando..." : "Criar empresa"}
        </Button>
      </div>
    </form>
  )
}
