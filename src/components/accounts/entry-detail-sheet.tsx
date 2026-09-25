"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarIcon, FileTextIcon, Trash2Icon } from "lucide-react"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { deleteAccountEntryAction, settleAccountEntryAction, undoSettlementAction } from "@/components/accounts/actions"
import { CurrencyInput } from "@/components/sales/currency-input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deriveStatus, type AccountStatus } from "@/lib/accounts/filter"
import {
  allocationModeLabel,
  billingFrequencyLabel,
  contractModalityLabel,
  kindConfig,
  statusBadgeStyle,
  statusLabel,
} from "@/lib/accounts/labels"
import { categoryColor } from "@/lib/category-color"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AccountEntry, LedgerKind } from "@/modules/accounts/types"
import { computeBeneficiaryShare } from "@/modules/settlements/domain"

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t pt-4 text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  )
}

function Field({ label, value, full = false }: { label: string; value: React.ReactNode; full?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", full && "col-span-2")}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-[13px]">{value}</span>
    </div>
  )
}

function CategoryValue({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-1.75 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(categoryId) }} />
      {categoryName}
    </span>
  )
}

export function EntryDetailSheet({
  entry: entryProp,
  kind,
  open,
  onOpenChange,
  onEdit,
}: {
  entry: AccountEntry | null
  kind: LedgerKind
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (entry: AccountEntry) => void
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const today = React.useMemo(() => new Date(), [])
  const config = kindConfig[kind]

  // Keep showing the last entry while the Sheet animates closed — the parent
  // clears `entry` at the same time it flips `open` to false.
  const [lastEntry, setLastEntry] = React.useState<AccountEntry | null>(entryProp)
  if (entryProp && entryProp !== lastEntry) {
    setLastEntry(entryProp)
  }
  const entry = entryProp ?? lastEntry

  const [settleDate, setSettleDate] = React.useState(today)
  const [settleAmount, setSettleAmount] = React.useState(0)
  const [settleReference, setSettleReference] = React.useState("")
  const [settleError, setSettleError] = React.useState<string | null>(null)
  const [settlePending, setSettlePending] = React.useState(false)
  const [reversingSettlementId, setReversingSettlementId] = React.useState<string | null>(null)

  // Reset the baixa form fields whenever a different entry is opened — same
  // "adjust state during render" pattern as account-entry-dialog.tsx.
  const [loadedSettleEntryId, setLoadedSettleEntryId] = React.useState<string | null>(null)
  if (entry && entry.id !== loadedSettleEntryId) {
    setLoadedSettleEntryId(entry.id)
    setSettleDate(today)
    // Left blank rather than defaulting to the full remaining amount — this
    // may be a recebimento/pagamento parcial (RN-06).
    setSettleAmount(0)
    setSettleReference("")
    setSettleError(null)
  }

  // The Sheet root stays mounted even with no entry so opening it is a
  // closed → open transition, which is what plays the slide/fade animation.
  if (!entry) return <Sheet open={open} onOpenChange={onOpenChange} />

  const accountStatus: AccountStatus = deriveStatus(entry, today)
  const isSettled = accountStatus === "PAID"
  const originLabel = entry.installment ? `Contrato · Parcela ${entry.installment}` : "Avulsa"
  const remaining = isSettled ? 0 : Math.max(0, entry.amount - entry.settledAmount)
  // Allocation.amount is the favorecido's share of the whole contract — scale
  // it down to this parcela's amount, same formula the settlements module
  // uses to credit a favorecido on a partial recebimento (RN-05).
  const installmentAllocations = entry.contract
    ? entry.allocations.map((allocation) => ({
        ...allocation,
        amount: computeBeneficiaryShare(entry.amount, entry.contract!.totalAmount, allocation.amount),
      }))
    : entry.allocations
  const allocationTotal = installmentAllocations.reduce((sum, allocation) => sum + allocation.amount, 0)
  const settlementsTotal = entry.settlements.reduce((sum, settlement) => sum + settlement.settledAmount, 0)

  async function handleDelete() {
    if (!entry) return
    setPending(true)
    const result = await deleteAccountEntryAction(entry.id)
    setPending(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Lançamento excluído.")
    onOpenChange(false)
    router.refresh()
  }

  async function handleSettle() {
    if (!entry) return
    if (settleAmount <= 0) {
      setSettleError("Informe o valor.")
      return
    }
    if (settleAmount > remaining) {
      setSettleError("O valor não pode ser maior do que o saldo em aberto.")
      return
    }
    setSettleError(null)
    setSettlePending(true)
    const result = await settleAccountEntryAction({
      entryId: entry.id,
      settledAt: settleDate,
      settledAmount: settleAmount,
      note: settleReference.trim() || undefined,
    })
    setSettlePending(false)
    if (!result.ok) {
      setSettleError(result.error)
      return
    }
    toast.success(kind === "pay" ? "Pagamento registrado." : "Recebimento registrado.")
    onOpenChange(false)
    router.refresh()
  }

  async function handleReverseSettlement(settlementId: string) {
    setReversingSettlementId(settlementId)
    const result = await undoSettlementAction(settlementId)
    setReversingSettlementId(null)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Estornado.")
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/45"
        initialFocus={false}
        className="flex h-full w-full flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-150"
      >
        <SheetHeader className="gap-2 border-b p-4">
          <SheetTitle className="pr-8 text-base font-semibold wrap-break-word whitespace-normal">
            {entry.description}
          </SheetTitle>
          <p className="text-[13px] text-muted-foreground">{entry.contactName}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="inline-flex h-5.5 items-center rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground"
              style={statusBadgeStyle[accountStatus]}
            >
              {statusLabel(accountStatus, kind)}
            </span>
            <span className="inline-flex h-5.5 items-center rounded-full border border-border bg-transparent px-2 text-xs font-medium text-muted-foreground">
              {originLabel}
            </span>
          </div>
        </SheetHeader>

        <Tabs defaultValue="details" className="flex flex-1 flex-col gap-0 overflow-hidden">
          <TabsList className="mx-4 mt-3 w-fit">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="settlements">{config.settlementsTabLabel}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-4 rounded-xl bg-muted p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor</p>
              <p className="text-[28px] leading-tight font-semibold">{formatBRL(entry.amount)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vencimento" value={formatDate(entry.dueDate)} />
              <Field label={config.remainingLabel} value={formatBRL(remaining)} />
            </div>

            {!isSettled && (
              <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
                <p className="text-[13px] font-semibold">{config.settleFormTitle}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Valor</Label>
                    <CurrencyInput valueInCents={settleAmount} onValueChange={setSettleAmount} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settle-reference" className="text-xs font-normal text-muted-foreground">
                      Identificador
                    </Label>
                    <Input
                      id="settle-reference"
                      placeholder="Opcional"
                      value={settleReference}
                      onChange={(event) => setSettleReference(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-normal text-muted-foreground">Data</Label>
                    <Popover>
                      <PopoverTrigger
                        render={<Button type="button" variant="outline" className="w-full justify-start font-normal" />}
                      >
                        <CalendarIcon className="size-4" />
                        {formatDate(settleDate)}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={settleDate}
                          onSelect={(value) => value && setSettleDate(value)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {settleError && <p className="text-xs text-destructive">{settleError}</p>}
                <Button onClick={handleSettle} disabled={settlePending} className="self-end">
                  {settlePending ? "Salvando..." : config.settleActionLabel}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionTitle>{config.contractOriginLabel}</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label={config.contactLabel} value={entry.contactName} />
              <Field label="Categoria" value={<CategoryValue categoryId={entry.categoryId} categoryName={entry.categoryName} />} />
              <Field label="Descrição" value={entry.description} full />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <SectionTitle>Cobrança</SectionTitle>

            {!entry.contract ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor" value={formatBRL(entry.amount)} />
                <Field label="Data de vencimento" value={formatDate(entry.dueDate)} />
                <Field label="Forma de pagamento" value={entry.paymentMethod} />
                <Field label={config.settlementAccountLabel} value={entry.bankAccountName} full />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <p className="text-[13px] font-semibold">Esta parcela</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Parcela"
                      value={
                        entry.installmentNumber ? `${entry.installmentNumber} de ${entry.contract.installmentsCount}` : "—"
                      }
                    />
                    <Field label="Valor" value={formatBRL(entry.amount)} />
                    <Field label="Vencimento" value={formatDate(entry.dueDate)} />
                    <Field label="Forma de pagamento" value={entry.paymentMethod} />
                    <Field label={config.settlementAccountLabel} value={entry.bankAccountName} full />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-[13px] font-semibold">Contrato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Modalidade" value={contractModalityLabel[entry.contract.modality]} />
                    <Field label="Valor total" value={formatBRL(entry.contract.totalAmount)} />
                    <Field label="Quantidade de parcelas" value={entry.contract.installmentsCount} />
                    <Field label="Periodicidade" value={billingFrequencyLabel[entry.contract.billingFrequency]} />
                    <Field label="Primeiro vencimento" value={formatDate(entry.contract.firstDueDate)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {isSettled && (
            <div className="flex flex-col gap-3">
              <SectionTitle>{config.settlementSectionTitle}</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label={config.settlementDateLabel} value={entry.paidAt ? formatDate(entry.paidAt) : "—"} />
                <Field label={config.settledAmountLabel} value={formatBRL(entry.settledAmount)} />
                {entry.interest > 0 && <Field label="Juros" value={formatBRL(entry.interest)} />}
                {entry.fine > 0 && <Field label="Multa" value={formatBRL(entry.fine)} />}
                {entry.discount > 0 && <Field label="Desconto" value={`− ${formatBRL(entry.discount)}`} />}
              </div>
            </div>
          )}

          {entry.allocations.length > 0 && entry.allocationMode && (
            <div className="flex flex-col gap-3">
              <SectionTitle>Repasse</SectionTitle>
              <Field label="Modo" value={allocationModeLabel[entry.allocationMode]} />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Favorecido</span>
                <div className="flex flex-col">
                  {installmentAllocations.map((allocation, index) => (
                    <div
                      key={allocation.beneficiaryId}
                      className={cn(
                        "flex items-center justify-between gap-3 py-2 text-[13px]",
                        index > 0 && "border-t",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{allocation.beneficiaryName}</span>
                      {allocation.percentage !== null && (
                        <span className="shrink-0 text-xs text-muted-foreground">{allocation.percentage}%</span>
                      )}
                      <span className="shrink-0 font-medium">{formatBRL(allocation.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-[13px] font-semibold">
                <span>Total do repasse</span>
                <span>{formatBRL(allocationTotal)}</span>
              </div>
            </div>
          )}
          </TabsContent>

          <TabsContent value="settlements" className="flex flex-1 flex-col overflow-y-auto p-4">
            {entry.settlements.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{config.emptySettlementsLabel}</p>
            ) : (
              <div className="rounded-xl border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="h-9 border-b text-xs text-muted-foreground">
                      <th className="px-3 text-left font-medium">Conta</th>
                      <th className="px-3 text-left font-medium">Data</th>
                      <th className="px-3 text-left font-medium">Identificador</th>
                      <th className="px-3 text-right font-medium">Valor</th>
                      <th className="w-20 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {entry.settlements.map((settlement) => (
                      <tr key={settlement.id} className="border-b text-[13px] last:border-b-0">
                        <td className="px-3 py-2.5">{settlement.bankAccountName ?? "—"}</td>
                        <td className="px-3 py-2.5 tabular-nums">{formatDate(settlement.settledAt)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{settlement.note ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatBRL(settlement.settledAmount)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              nativeButton={false}
                              render={<Link href={`/receipts/${settlement.id}`} target="_blank" />}
                              aria-label="Emitir recibo"
                            >
                              <FileTextIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Estornar"
                              onClick={() => handleReverseSettlement(settlement.id)}
                              disabled={reversingSettlementId === settlement.id}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t bg-muted/50 px-3 py-2.5 text-[13px] font-semibold">
                  <span>Total</span>
                  <span>{formatBRL(settlementsTotal)}</span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <SheetFooter className={cn("gap-2 border-t p-4", isSettled ? "grid grid-cols-1" : "grid grid-cols-2")}>
          <Button onClick={() => onEdit(entry)} disabled={pending}>
            Editar
          </Button>
          {!isSettled && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              Excluir
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
