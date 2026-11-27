"use client"

import * as React from "react"
import { CircleCheckIcon, FileTextIcon } from "lucide-react"

import { listImportsAction } from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { formatDate } from "@/lib/format"
import { formatBusinessDateTime } from "@/lib/today"
import { cn } from "@/lib/utils"
import type { StatementImport } from "@/modules/statements/types"

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

function formatPeriod(start: Date | null, end: Date | null): string | null {
  if (start && end) return `${formatDate(start)} a ${formatDate(end)}`
  if (end) return `até ${formatDate(end)}`
  if (start) return `desde ${formatDate(start)}`
  return null
}

/**
 * Histórico de importações de OFX da conta, do mais recente ao mais antigo —
 * todos os arquivos já enviados, inclusive reimportações que não trouxeram
 * nada novo. Recarrega a cada abertura, para refletir o que foi conciliado.
 */
export function ImportHistorySheet({
  bankAccountId,
  open,
  onOpenChange,
}: {
  bankAccountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [imports, setImports] = React.useState<StatementImport[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    listImportsAction(bankAccountId).then((response) => {
      if (cancelled) return
      if (response.ok) {
        setImports(response.data)
        setError(null)
      } else {
        setError(response.error)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, bankAccountId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/45"
        initialFocus={false}
        className="flex h-full w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-150"
      >
        <SheetHeader className="gap-1 border-b p-4 pr-12">
          <SheetTitle className="text-base font-semibold">Histórico de importações</SheetTitle>
          <SheetDescription>
            {imports && imports.length > 0
              ? plural(imports.length, "extrato importado", "extratos importados")
              : "Os arquivos OFX enviados para esta conta."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {!imports && !error && <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>}
          {imports && imports.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum extrato importado ainda.</p>
          )}
          {imports && imports.length > 0 && (
            <ul className="divide-y">
              {imports.map((statementImport) => (
                <ImportHistoryRow key={statementImport.id} statementImport={statementImport} />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ImportHistoryRow({ statementImport }: { statementImport: StatementImport }) {
  const { importedCount, duplicateCount, linkedCount, reconciledCount } = statementImport
  const period = formatPeriod(statementImport.periodStart, statementImport.periodEnd)
  const fullyReconciled = linkedCount > 0 && reconciledCount === linkedCount

  const counts = [
    importedCount === 0 ? "nenhuma nova" : plural(importedCount, "nova", "novas"),
    duplicateCount ? plural(duplicateCount, "já importada", "já importadas") : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <FileTextIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-sm font-medium" title={statementImport.fileName}>
            {statementImport.fileName}
          </p>
          {linkedCount > 0 && (
            <span
              className={cn(
                "flex shrink-0 items-center gap-1 text-xs",
                fullyReconciled ? "text-info" : "text-warning",
              )}
              title="Transações deste extrato já conciliadas"
            >
              {fullyReconciled && <CircleCheckIcon className="size-3.5" />}
              {reconciledCount} de {linkedCount} conciliadas
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatBusinessDateTime(statementImport.importedAt)}
          {statementImport.importedByName && ` · por ${statementImport.importedByName}`}
        </p>
        <p className="text-xs text-muted-foreground">
          {[period && `Período ${period}`, counts].filter(Boolean).join(" · ")}
        </p>
      </div>
    </li>
  )
}
