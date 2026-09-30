"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { acceptInvitationAction } from "@/app/invite/[token]/actions"
import { Button } from "@/components/ui/button"
import { orgPath } from "@/lib/org-path"

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleAccept() {
    setError(null)
    setPending(true)

    const result = await acceptInvitationAction(token)

    if (!result.ok) {
      setError(result.error)
      setPending(false)
      return
    }

    router.push(orgPath(result.data.organizationId, "/dashboard"))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleAccept} disabled={pending}>
        {pending ? "Entrando..." : "Aceitar convite"}
      </Button>
    </div>
  )
}
