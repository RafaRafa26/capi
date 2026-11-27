"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { importStatementAction } from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { Button } from "@/components/ui/button"
import type { ImportStatementResult } from "@/modules/statements/types"

/** O que a importação encontrou — reimportar o mesmo arquivo não duplica nada (RN-16). */
function notifyImportResult({ importedCount, duplicateCount, totalCount }: ImportStatementResult) {
  if (totalCount === 0) {
    toast.info("O arquivo não tem transações.")
    return
  }
  if (importedCount === 0) {
    toast.info("Nenhuma transação nova", {
      description:
        totalCount === 1
          ? "A transação deste arquivo já tinha sido importada."
          : `As ${totalCount} transações deste arquivo já tinham sido importadas.`,
    })
    return
  }
  toast.success(importedCount === 1 ? "1 transação nova importada" : `${importedCount} transações novas importadas`, {
    description:
      duplicateCount > 0
        ? duplicateCount === 1
          ? "1 já tinha sido importada antes e foi ignorada."
          : `${duplicateCount} já tinham sido importadas antes e foram ignoradas.`
        : undefined,
  })
}

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
  onImported?: (result: ImportStatementResult) => void
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
    notifyImportResult(response.data)
    onImported?.(response.data)
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
