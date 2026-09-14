"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"

import { importStatementAction } from "@/app/(app)/reconciliation/actions"
import { Button } from "@/components/ui/button"

/**
 * Imports an OFX file into the account already selected in the "Conta"
 * picker above — clicking goes straight to the OS file picker, no dialog.
 */
export function ImportOfxButton({
  bankAccountId,
  onImported,
}: {
  bankAccountId: string
  /** Called after a successful import so the caller can refresh its transaction list. */
  onImported?: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setError(null)
    setPending(true)

    const form = new FormData()
    form.set("bankAccountId", bankAccountId)
    form.set("file", file)

    const response = await importStatementAction(form)

    setPending(false)
    if (!response.ok) {
      setError(response.error)
      return
    }
    onImported?.()
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept=".ofx" className="hidden" onChange={handleFileChange} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!bankAccountId || pending}
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon />
        {pending ? "Importando..." : "Importar"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
