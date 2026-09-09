"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, HelpCircleIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

import { createSaleAction } from "@/app/(app)/new-sale/actions"
import { CurrencyInput } from "@/components/sales/currency-input"
import { InstallmentsDialog } from "@/components/sales/installments-dialog"
import { NewClientDialog } from "@/components/sales/new-client-dialog"
import { NewSaleCategoryDialog } from "@/components/sales/new-sale-category-dialog"
import {
  SearchableSelect,
  type SearchableSelectGroup,
  type SearchableSelectOption,
} from "@/components/sales/searchable-select"
import { NewBankAccountDialog } from "@/components/bank-accounts/new-bank-account-dialog"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatBRL, formatDate } from "@/lib/format"
import type { BankAccount } from "@/modules/bank-accounts/types"
import {
  generateInstallments,
  generateRecurringInstallments,
  RECURRING_ROLLING_WINDOW,
} from "@/modules/sales/domain"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import type {
  AllocationMode,
  BillingFrequency,
  BillingType,
  Installment,
  PaymentMethod,
} from "@/modules/sales/types"

type Aba = "avulsa" | "contrato"

const paymentMethodLabel: Record<PaymentMethod, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência",
}

const billingFrequencyLabel: Record<BillingFrequency, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
}

const installmentOptions: SearchableSelectOption[] = Array.from({ length: 60 }, (_, index) => ({
  value: String(index + 1),
  label: `${index + 1}x`,
}))

function oneYearAfter(date: Date): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + 1)
  return result
}

interface AllocationRow {
  id: string
  beneficiaryId: string
  value: number
}

/** One section per top-level category, listing its subcategories — or the
 * category itself, for one with no subcategories yet. */
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

interface NewSaleFormProps {
  clients: Contact[]
  beneficiaries: Contact[]
  categories: Category[]
  bankAccounts: BankAccount[]
}

export function NewSaleForm({
  clients: initialClients,
  beneficiaries,
  categories: initialCategories,
  bankAccounts: initialBankAccounts,
}: NewSaleFormProps) {
  const router = useRouter()

  const [aba, setAba] = React.useState<Aba>("contrato")

  const [clients, setClients] = React.useState(initialClients)
  const [categories, setCategories] = React.useState(initialCategories)
  const [bankAccounts, setBankAccounts] = React.useState(initialBankAccounts)

  const [contactId, setContactId] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [description, setDescription] = React.useState("")

  const [totalAmount, setTotalAmount] = React.useState(0)
  const [billingType, setBillingType] = React.useState<BillingType>("INSTALLMENTS")
  const [installmentsCount, setInstallmentsCount] = React.useState<number | null>(null)
  const [billingFrequency, setBillingFrequency] = React.useState<BillingFrequency>("MONTHLY")
  const [firstDueDate, setFirstDueDate] = React.useState(new Date())
  const [recurrenceIndeterminate, setRecurrenceIndeterminate] = React.useState(true)
  const [recurrenceEndDate, setRecurrenceEndDate] = React.useState(new Date())
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | "">("")
  const [bankAccountId, setBankAccountId] = React.useState("")

  const [allocationEnabled, setAllocationEnabled] = React.useState(false)
  const [allocationMode, setAllocationMode] = React.useState<AllocationMode>("PERCENTAGE")
  const [allocationRows, setAllocationRows] = React.useState<AllocationRow[]>([])

  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const isRecurring = aba === "contrato" && billingType === "RECURRING"
  const effectiveCount = aba === "avulsa" ? 1 : (installmentsCount ?? 1)

  function buildInstallments(): Installment[] {
    try {
      if (isRecurring) {
        return generateRecurringInstallments({
          amountPerOccurrence: totalAmount,
          firstDueDate,
          frequency: billingFrequency,
          endDate: recurrenceIndeterminate ? null : recurrenceEndDate,
        })
      }
      return generateInstallments({
        totalAmount,
        count: effectiveCount,
        firstDueDate,
        frequency: billingFrequency,
      })
    } catch {
      // Invalid intermediate state while the user is still picking dates
      // (e.g. an end date before the first due date) — the real validation
      // happens on submit; the preview just goes empty until it's valid.
      return []
    }
  }

  const [installments, setInstallments] = React.useState<Installment[]>(buildInstallments)

  // Regenerating on every change to the base fields (and resetting manual
  // per-installment edits when they do) is the intended behavior — RN-17
  // treats `valor`/count/frequency/first due date as the source of truth,
  // with individual edits layered on top only until one of those changes.
  const generationKey = isRecurring
    ? `R-${totalAmount}-${firstDueDate.getTime()}-${billingFrequency}-${recurrenceIndeterminate ? "indeterminate" : recurrenceEndDate.getTime()}`
    : `I-${totalAmount}-${effectiveCount}-${firstDueDate.getTime()}-${billingFrequency}`
  const [lastGenerationKey, setLastGenerationKey] = React.useState(generationKey)
  if (generationKey !== lastGenerationKey) {
    setLastGenerationKey(generationKey)
    setInstallments(buildInstallments())
  }

  function updateInstallment(installmentNumber: number, patch: Partial<Pick<Installment, "dueDate" | "amount">>) {
    setInstallments((prev) =>
      prev.map((installment) =>
        installment.installmentNumber === installmentNumber ? { ...installment, ...patch } : installment,
      ),
    )
  }

  function allocationAmount(row: AllocationRow) {
    return allocationMode === "PERCENTAGE" ? Math.round(totalAmount * (row.value / 100)) : row.value
  }

  const totalAllocated = allocationRows.reduce((sum, row) => sum + allocationAmount(row), 0)

  function addAllocationRow() {
    setAllocationRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        beneficiaryId: "",
        value: prev.length === 0 && allocationMode === "PERCENTAGE" ? 100 : 0,
      },
    ])
  }

  function removeAllocationRow(id: string) {
    setAllocationRows((prev) => prev.filter((row) => row.id !== id))
  }

  function updateAllocationRow(id: string, patch: Partial<AllocationRow>) {
    setAllocationRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const clientOptions: SearchableSelectOption[] = clients.map((client) => ({
    value: client.id,
    label: client.name,
  }))

  const incomeCategories = categories.filter((category) => category.type === "INCOME")
  const categoryGroups = buildCategoryGroups(incomeCategories)

  const bankAccountOptions: SearchableSelectOption[] = bankAccounts.map((account) => ({
    value: account.id,
    label: `${account.name} - Ag ${account.branchNumber} / CC ${account.accountNumber}`,
  }))

  async function handleSubmit() {
    setError(null)
    setPending(true)

    const payload = {
      contactId,
      categoryId,
      bankAccountId,
      description,
      totalAmount,
      paymentMethod,
      billingType: isRecurring ? "RECURRING" : "INSTALLMENTS",
      installmentsCount: installments.length,
      billingFrequency,
      firstDueDate,
      recurrenceEndDate: isRecurring && !recurrenceIndeterminate ? recurrenceEndDate : null,
      installments,
      allocationMode: allocationEnabled ? allocationMode : undefined,
      allocations: allocationEnabled
        ? allocationRows.map(({ beneficiaryId, value }) => ({ beneficiaryId, value }))
        : [],
    }

    const form = new FormData()
    form.set("payload", JSON.stringify(payload))
    const result = await createSaleAction(form)

    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.push("/dashboard")
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Tabs value={aba} onValueChange={(value) => setAba(value as Aba)}>
        <TabsList>
          <TabsTrigger value="avulsa">Avulsa</TabsTrigger>
          <TabsTrigger value="contrato">Contrato (recorrente)</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Dados da venda</h3>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <SearchableSelect
                className="w-full"
                options={clientOptions}
                value={contactId}
                onValueChange={setContactId}
                placeholder="Selecione o cliente"
                footer={
                  <NewClientDialog
                    onCreated={(contact) => {
                      setClients((prev) => [...prev, contact])
                      setContactId(contact.id)
                    }}
                  />
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <SearchableSelect
                  className="w-full"
                  groups={categoryGroups}
                  value={categoryId}
                  onValueChange={setCategoryId}
                  placeholder="Selecione a categoria"
                  footer={
                    <NewSaleCategoryDialog
                      categories={categories}
                      onCreated={(category) => {
                        setCategories((prev) => [...prev, category])
                        setCategoryId(category.id)
                      }}
                    />
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold">Cobrança</h3>
                {aba === "contrato" && (
                  <Tooltip>
                    <TooltipTrigger className="text-muted-foreground">
                      <HelpCircleIcon className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>Como o cliente será cobrado por esse contrato.</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {aba === "contrato" && (
                <ToggleGroup
                  variant="outline"
                  multiple={false}
                  value={[billingType === "INSTALLMENTS" ? "parcelada" : "recorrente"]}
                  onValueChange={(value) =>
                    value[0] &&
                    setBillingType(value[0] === "parcelada" ? "INSTALLMENTS" : "RECURRING")
                  }
                >
                  <ToggleGroupItem value="parcelada">Parcelada</ToggleGroupItem>
                  <ToggleGroupItem value="recorrente">Recorrente</ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>

            {aba === "avulsa" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <CurrencyInput valueInCents={totalAmount} onValueChange={setTotalAmount} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de vencimento</Label>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button variant="outline" className="w-full justify-start font-normal" />
                      }
                    >
                      <CalendarIcon />
                      {formatDate(firstDueDate)}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={firstDueDate}
                        onSelect={(value) => value && setFirstDueDate(value)}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>{billingType === "RECURRING" ? "Valor da cobrança" : "Valor total"}</Label>
                    <CurrencyInput valueInCents={totalAmount} onValueChange={setTotalAmount} />
                  </div>
                  {billingType === "INSTALLMENTS" && (
                    <div className="space-y-1.5">
                      <Label>Parcelas</Label>
                      <SearchableSelect
                        className="w-full"
                        options={installmentOptions}
                        value={installmentsCount === null ? "" : String(installmentsCount)}
                        onValueChange={(value) => setInstallmentsCount(value ? Number(value) : null)}
                        placeholder="Selecione"
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Periodicidade</Label>
                    <Select
                      value={billingFrequency}
                      onValueChange={(value) => value && setBillingFrequency(value as BillingFrequency)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue>{(value: BillingFrequency) => billingFrequencyLabel[value]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(billingFrequencyLabel).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{billingType === "RECURRING" ? "Primeira cobrança" : "Primeiro vencimento"}</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button variant="outline" className="w-full justify-start font-normal" />
                        }
                      >
                        <CalendarIcon />
                        {formatDate(firstDueDate)}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={firstDueDate}
                          onSelect={(value) => value && setFirstDueDate(value)}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {billingType === "RECURRING" && (
                    <div className="space-y-1.5">
                      <Label>Término</Label>
                      <div className="flex h-8 items-center gap-2">
                        <Switch
                          checked={recurrenceIndeterminate}
                          onCheckedChange={(checked) => {
                            setRecurrenceIndeterminate(checked)
                            if (!checked) setRecurrenceEndDate(oneYearAfter(firstDueDate))
                          }}
                        />
                        <span className="text-sm text-muted-foreground">Indeterminado</span>
                      </div>
                    </div>
                  )}
                  {billingType === "RECURRING" && !recurrenceIndeterminate && (
                    <div className="space-y-1.5">
                      <Label>Data de término</Label>
                      <Popover>
                        <PopoverTrigger
                          render={
                            <Button variant="outline" className="w-full justify-start font-normal" />
                          }
                        >
                          <CalendarIcon />
                          {formatDate(recurrenceEndDate)}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={recurrenceEndDate}
                            onSelect={(value) => value && setRecurrenceEndDate(value)}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                {billingType === "RECURRING" && recurrenceIndeterminate && (
                  <p className="text-xs text-muted-foreground">
                    Sem data de término, mantemos sempre as próximas {RECURRING_ROLLING_WINDOW}{" "}
                    cobranças geradas: ao conciliar uma, criamos automaticamente a seguinte.
                  </p>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => value && setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: PaymentMethod | "") => (value ? paymentMethodLabel[value] : "Selecione")}
                    </SelectValue>
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
                <Label>Conta de recebimento</Label>
                <SearchableSelect
                  className="w-full"
                  options={bankAccountOptions}
                  value={bankAccountId}
                  onValueChange={setBankAccountId}
                  placeholder="Selecione a conta"
                  footer={
                    <NewBankAccountDialog
                      onCreated={(account) => {
                        setBankAccounts((prev) => [...prev, account])
                        setBankAccountId(account.id)
                      }}
                    />
                  }
                />
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={allocationEnabled} onCheckedChange={setAllocationEnabled} />
                <Label className="font-medium">Habilitar repasse</Label>
              </div>
              {allocationEnabled && (
                <ToggleGroup
                  variant="outline"
                  multiple={false}
                  value={[allocationMode]}
                  onValueChange={(value) => value[0] && setAllocationMode(value[0] as AllocationMode)}
                >
                  <ToggleGroupItem value="PERCENTAGE">Percentual</ToggleGroupItem>
                  <ToggleGroupItem value="FIXED_AMOUNT">Valor fixo</ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>

            {allocationEnabled && (
              <div className="space-y-3">
                {allocationRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3">
                    <Select
                      value={row.beneficiaryId}
                      onValueChange={(value) =>
                        value && updateAllocationRow(row.id, { beneficiaryId: value })
                      }
                    >
                      <SelectTrigger className="w-full flex-1">
                        <SelectValue>
                          {() => beneficiaries.find((b) => b.id === row.beneficiaryId)?.name ?? "Selecione"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiaries.map((beneficiary) => (
                          <SelectItem key={beneficiary.id} value={beneficiary.id}>
                            {beneficiary.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allocationMode === "PERCENTAGE" ? (
                      <Input
                        className="w-20 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        type="number"
                        min={0}
                        max={100}
                        value={row.value}
                        onChange={(event) =>
                          updateAllocationRow(row.id, {
                            value: Math.min(100, Math.max(0, Number(event.target.value) || 0)),
                          })
                        }
                      />
                    ) : (
                      <CurrencyInput
                        className="w-40"
                        valueInCents={row.value}
                        onValueChange={(value) => updateAllocationRow(row.id, { value })}
                      />
                    )}
                    <span className="w-28 shrink-0 text-right text-sm font-medium">
                      {formatBRL(allocationAmount(row))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAllocationRow(row.id)}
                      className="shrink-0 text-sm font-medium text-destructive hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addAllocationRow}>
                  + Adicionar favorecido
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Resumo</h3>
          <p className="text-2xl font-semibold">{formatBRL(totalAmount)}</p>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {isRecurring
                  ? "Valor por período"
                  : effectiveCount > 1
                    ? `${effectiveCount} parcelas de`
                    : "Valor da parcela"}
              </span>
              <span className="font-medium">{formatBRL(installments[0]?.amount ?? 0)}</span>
            </div>
            {isRecurring && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorrência</span>
                <span className="font-medium">
                  {billingFrequencyLabel[billingFrequency]}
                  {" · "}
                  {recurrenceIndeterminate ? "Indeterminada" : `até ${formatDate(recurrenceEndDate)}`}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {aba === "avulsa" ? "Data de vencimento" : "Primeiro vencimento"}
              </span>
              <span className="font-medium">{formatDate(firstDueDate)}</span>
            </div>
            {installments.length > 1 && !(isRecurring && recurrenceIndeterminate) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último vencimento</span>
                <span className="font-medium">
                  {formatDate(installments[installments.length - 1].dueDate)}
                </span>
              </div>
            )}
          </div>

          {allocationEnabled && allocationRows.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold">Repasse</h4>
                {allocationRows.map((row) => (
                  <div key={row.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {beneficiaries.find((b) => b.id === row.beneficiaryId)?.name}
                      {allocationMode === "PERCENTAGE" ? ` · ${row.value}%` : ""}
                    </span>
                    <span className="font-medium">{formatBRL(allocationAmount(row))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total a repassar</span>
                  <span className="font-medium">{formatBRL(totalAllocated)}</span>
                </div>
              </div>
            </>
          )}

          {installments.length > 1 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {isRecurring ? "Próximos lançamentos" : "Próximas parcelas"}
                  </h4>
                  <InstallmentsDialog installments={installments} onChange={updateInstallment} />
                </div>
                {installments.slice(0, 3).map((installment) => (
                  <div key={installment.installmentNumber} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {installment.installmentNumber} · {formatDate(installment.dueDate)}
                    </span>
                    <span className="font-medium">{formatBRL(installment.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")} disabled={pending}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  )
}
