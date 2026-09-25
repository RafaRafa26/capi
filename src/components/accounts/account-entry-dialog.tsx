"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { updateAccountEntryAction } from "@/components/accounts/actions"
import { CurrencyInput } from "@/components/sales/currency-input"
import {
  SearchableSelect,
  type SearchableSelectGroup,
  type SearchableSelectOption,
} from "@/components/sales/searchable-select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatBRL, formatDate } from "@/lib/format"
import type { BankAccount } from "@/modules/bank-accounts/types"
import type { AccountEntry, LedgerKind, PaymentMethodCode } from "@/modules/accounts/types"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"

const paymentMethodLabel: Record<PaymentMethodCode, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência",
}

const statusBadgeLabel: Record<AccountEntry["entryStatus"], (kind: LedgerKind) => string> = {
  FORECAST: () => "Em aberto",
  PARTIAL: () => "Parcialmente liquidado",
  SETTLED: (kind) => (kind === "pay" ? "Pago" : "Recebido"),
}

/** One section per top-level category, listing its subcategories — or the category itself, for one with no subcategories yet. */
function buildCategoryGroups(categories: Category[]): SearchableSelectGroup[] {
  const topLevel = categories.filter((category) => !category.parentId)
  return topLevel.map((top) => {
    const subcategories = categories.filter((category) => category.parentId === top.id)
    return {
      label: top.name,
      options:
        subcategories.length > 0
          ? subcategories.map((sub) => ({ value: sub.id, label: sub.name }))
          : [{ value: top.id, label: top.name }],
    }
  })
}

export function AccountEntryDialog({
  entry,
  kind,
  open,
  onOpenChange,
  contacts,
  categories,
  bankAccounts,
}: {
  entry: AccountEntry | null
  kind: LedgerKind
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Contact[]
  categories: Category[]
  bankAccounts: BankAccount[]
}) {
  const router = useRouter()

  const [contactId, setContactId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethodCode>("PIX")
  const [bankAccountId, setBankAccountId] = React.useState("")
  const [dueDate, setDueDate] = React.useState(new Date())
  const [amount, setAmount] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  // Reset the form fields whenever a different entry is opened — same
  // "adjust state during render" pattern as new-expense-form.tsx's
  // generationKey, not an effect, so it applies before the first paint.
  const [loadedEntryId, setLoadedEntryId] = React.useState<string | null>(null)
  if (entry && entry.id !== loadedEntryId) {
    setLoadedEntryId(entry.id)
    setContactId(entry.contactId)
    setCategoryId(entry.categoryId)
    setDescription(entry.description)
    setPaymentMethod(entry.paymentMethodCode)
    setBankAccountId(entry.bankAccountId)
    setDueDate(entry.dueDate)
    setAmount(entry.amount)
    setError(null)
  }

  if (!entry) return null

  const editableAmounts = entry.entryStatus === "FORECAST"
  const relevantCategories = categories.filter((category) => category.type === (kind === "pay" ? "EXPENSE" : "INCOME"))
  const categoryGroups = buildCategoryGroups(relevantCategories)

  const contactOptions: SearchableSelectOption[] = contacts.map((contact) => ({
    value: contact.id,
    label: contact.name,
  }))
  const bankAccountOptions: SearchableSelectOption[] = bankAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} — Ag ${account.branchNumber} / CC ${account.accountNumber}`,
  }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!entry) return
    setError(null)
    setPending(true)

    const payload = {
      contactId,
      categoryId,
      bankAccountId,
      description,
      paymentMethod,
      dueDate,
      amount,
    }

    const form = new FormData()
    form.set("payload", JSON.stringify(payload))
    const result = await updateAccountEntryAction(entry.id, form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{kind === "pay" ? "Conta a pagar" : "Conta a receber"}</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto py-2">
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2.5 text-sm">
              <div>
                <p className="font-medium">{statusBadgeLabel[entry.entryStatus](kind)}</p>
                {entry.installment && <p className="text-xs text-muted-foreground">Parcela {entry.installment}</p>}
                {entry.paidAt && (
                  <p className="text-xs text-muted-foreground">
                    {kind === "pay" ? "Pago em" : "Recebido em"} {formatDate(entry.paidAt)}
                  </p>
                )}
              </div>
              {entry.settledAmount > 0 && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{kind === "pay" ? "Pago" : "Recebido"}</p>
                  <p className="font-semibold">{formatBRL(entry.settledAmount)}</p>
                </div>
              )}
            </div>

            {entry.beneficiaryNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Favorecido{entry.beneficiaryNames.length > 1 ? "s" : ""} do repasse: {entry.beneficiaryNames.join(", ")}
              </p>
            )}

            <div className="space-y-1.5">
              <Label>Contato</Label>
              <SearchableSelect
                className="w-full"
                options={contactOptions}
                value={contactId}
                onValueChange={setContactId}
                placeholder="Selecione o contato"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <SearchableSelect
                  className="w-full"
                  groups={categoryGroups}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Selecione a categoria"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account-entry-description">Descrição</Label>
                <Input
                  id="account-entry-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor</Label>
                <CurrencyInput valueInCents={amount} onValueChange={setAmount} disabled={!editableAmounts} />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimento</Label>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start font-normal"
                        disabled={!editableAmounts}
                      />
                    }
                  >
                    <CalendarIcon />
                    {formatDate(dueDate)}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dueDate} onSelect={(value) => value && setDueDate(value)} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {!editableAmounts && (
              <p className="text-xs text-muted-foreground">
                Valor e vencimento não podem ser alterados: este lançamento já foi conciliado.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={(value) => value && setPaymentMethod(value as PaymentMethodCode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{(value: PaymentMethodCode) => paymentMethodLabel[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethodLabel).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Conta</Label>
                <SearchableSelect
                  className="w-full"
                  options={bankAccountOptions}
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  placeholder="Selecione a conta"
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
