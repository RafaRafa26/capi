"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarIcon,
  ChevronDownIcon,
  CreditCardIcon,
  FlagIcon,
  LandmarkIcon,
  ListOrderedIcon,
  RepeatIcon,
  TagIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import {
  createExpenseAction,
  createSaleAction,
  type EntryOptions,
} from "@/app/o/[orgId]/(app)/entries/actions"
import { NewBankAccountDialog } from "@/components/bank-accounts/new-bank-account-dialog"
import { buildCategoryGroups } from "@/components/categories/category-groups"
import { QuickAddContactDialog } from "@/components/contacts/quick-add-contact-dialog"
import { AllocationEditor } from "@/components/entries/allocation-editor"
import { InstallmentChips, InstallmentsEditor, isEdited } from "@/components/entries/installments-editor"
import { NewSaleCategoryDialog } from "@/components/sales/new-sale-category-dialog"
import { SearchableSelect, type SearchableSelectOption } from "@/components/sales/searchable-select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { billingFrequencyLabel, paymentMethodLabel } from "@/lib/accounts/labels"
import {
  buildPayload,
  draftForNext,
  emptyDraft,
  generateSchedule,
  isDraftDirty,
  scheduleKey,
  switchKind,
  withInstallmentsTotal,
  type EntryDraft,
  type EntryKind,
  type Repetition,
} from "@/lib/entries/draft"
import { formatBankAccountLabel, formatBRL, formatDate } from "@/lib/format"
import { businessToday } from "@/lib/today"
import { cn } from "@/lib/utils"
import type { Contact } from "@/modules/contacts/types"
import { expenseInputSchema } from "@/modules/expenses/schema"
import { RECURRING_ROLLING_WINDOW } from "@/modules/sales/domain"
import { saleInputSchema } from "@/modules/sales/schema"
import type { BillingFrequency, Installment, PaymentMethod } from "@/modules/sales/types"
import { useOrgPath } from "@/hooks/use-org-path"

// Payload keys the server and the zod schemas report errors on, in the
// order the fields appear — the first one with an error gets the focus.
const FIELD_ORDER = [
  "totalAmount",
  "description",
  "contactId",
  "categoryId",
  "installmentsCount",
  "firstDueDate",
  "recurrenceEndDate",
  "paymentMethod",
  "bankAccountId",
  "installments",
  "allocationMode",
  "allocations",
] as const
type FieldKey = (typeof FIELD_ORDER)[number]
type FieldErrors = Partial<Record<FieldKey, string>>

function isFieldKey(value: string | undefined): value is FieldKey {
  return FIELD_ORDER.includes(value as FieldKey)
}

const installmentCountOptions: SearchableSelectOption[] = Array.from({ length: 59 }, (_, index) => ({
  value: String(index + 2),
  label: `${index + 2}x`,
}))

const repetitionLabel: Record<Repetition, string> = {
  single: "Não repete",
  installments: "Parcelar",
  recurring: "Recorrente",
}

// The property list's controls read as plain values until hovered/focused.
const ghostControl =
  "h-9 w-full border-transparent bg-transparent font-medium shadow-none hover:bg-muted dark:bg-transparent dark:hover:bg-muted"

function oneYearAfter(date: Date): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + 1)
  return result
}

function isApplePlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 bg-background px-1.5 font-mono text-[11px] text-muted-foreground">
      {children}
    </kbd>
  )
}

function PropertyRow({
  icon: Icon,
  label,
  field,
  error,
  children,
}: {
  icon: LucideIcon
  label: string
  field?: FieldKey
  error?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-field={field}
      // On a phone the label sits above the value so neither gets truncated.
      className="grid grid-cols-1 border-b py-1.5 last:border-b-0 sm:grid-cols-[184px_minmax(0,1fr)] sm:items-start sm:gap-2 sm:py-1"
    >
      <span className="flex h-6 items-center gap-2 text-xs text-muted-foreground sm:h-9 sm:text-sm">
        <Icon className="size-3.5 shrink-0 sm:size-4" />
        <span className="truncate">{label}</span>
      </span>
      <div className="min-w-0 max-sm:-mx-2.5">
        {children}
        {error && <p className="px-2.5 pt-0.5 pb-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function DateButton({
  value,
  onChange,
  invalid,
  ariaLabel,
}: {
  value: Date
  onChange: (date: Date) => void
  invalid?: boolean
  ariaLabel: string
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            aria-label={ariaLabel}
            aria-invalid={invalid || undefined}
            className="h-9 w-full justify-start px-2.5 font-medium tabular-nums"
          />
        }
      >
        {formatDate(value)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={(date) => date && onChange(date)} locale={ptBR} />
      </PopoverContent>
    </Popover>
  )
}

export interface EntryFormProps {
  initialKind: EntryKind
  options: EntryOptions | null
  loadError: string | null
  amountRef: React.RefObject<HTMLInputElement | null>
  onRetryLoad: () => void
  onOptionsChange: (update: (options: EntryOptions) => EntryOptions) => void
  onDirtyChange: (dirty: boolean) => void
  onClose: () => void
  onSaved: () => void
}

/**
 * Nova venda / nova despesa, inside the sheet the "Registrar" button opens.
 * The value comes first and big; everything else is a list of properties
 * edited in place. Parcelas and repasse only take space when used.
 */
export function EntryForm({
  initialKind,
  options,
  loadError,
  amountRef,
  onRetryLoad,
  onOptionsChange,
  onDirtyChange,
  onClose,
  onSaved,
}: EntryFormProps) {
  const router = useRouter()
  const toOrg = useOrgPath()

  const [draft, setDraft] = React.useState(() => emptyDraft(initialKind, businessToday()))
  const [errors, setErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [editingInstallments, setEditingInstallments] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  // Per-installment edits live on top of the generated schedule until a
  // field it's generated from changes (RN-17). `baseline` is that generated
  // schedule, kept so edits can be marked and undone.
  const [baseline, setBaseline] = React.useState<Installment[]>(() => generateSchedule(draft))
  const [installments, setInstallments] = React.useState<Installment[]>(baseline)
  const key = scheduleKey(draft)
  const [lastKey, setLastKey] = React.useState(key)
  if (key !== lastKey) {
    const regenerated = generateSchedule(draft)
    setLastKey(key)
    setBaseline(regenerated)
    setInstallments(regenerated)
  }

  React.useEffect(() => {
    onDirtyChange(isDraftDirty(draft))
  }, [draft, onDirtyChange])

  const isSale = draft.kind === "sale"
  const noun = isSale ? "venda" : "despesa"
  const contacts = options?.contacts ?? []
  const categories = options?.categories ?? []
  const bankAccounts = options?.bankAccounts ?? []
  const loading = options === null && !loadError

  // With a single bank account there's nothing to choose.
  const soleAccountId = bankAccounts.length === 1 ? bankAccounts[0].id : ""
  const effectiveDraft: EntryDraft = { ...draft, bankAccountId: draft.bankAccountId || soleAccountId }

  const contactOptions: SearchableSelectOption[] = contacts
    .filter((contact) => !isSale || contact.contactType === "CLIENT")
    .map((contact) => ({ value: contact.id, label: contact.name }))
  const beneficiaries = contacts.filter((contact) => contact.contactType === "BENEFICIARY")
  const categoryGroups = buildCategoryGroups(
    categories.filter((category) => category.type === (isSale ? "INCOME" : "EXPENSE")),
  )
  const bankAccountOptions: SearchableSelectOption[] = bankAccounts.map((account) => ({
    value: account.id,
    label: formatBankAccountLabel(account),
  }))

  const recurring = draft.repetition === "recurring"
  const amountLabel =
    draft.repetition === "single"
      ? "Valor"
      : draft.repetition === "installments"
        ? "Valor total"
        : isSale
          ? "Valor da cobrança"
          : "Valor por pagamento"
  const dateLabel =
    draft.repetition === "single"
      ? "Vencimento"
      : draft.repetition === "installments"
        ? "1º vencimento"
        : isSale
          ? "Primeira cobrança"
          : "Primeiro pagamento"
  const loadingPlaceholder = loading ? "Carregando..." : undefined

  function update(patch: Partial<EntryDraft>, ...fields: FieldKey[]) {
    setDraft((current) => ({ ...current, ...patch }))
    if (fields.length > 0) {
      setErrors((current) => {
        const next = { ...current }
        for (const field of fields) delete next[field]
        return next
      })
    }
  }

  function addContact(contact: Contact) {
    onOptionsChange((current) => ({ ...current, contacts: [...current.contacts, contact] }))
  }

  /**
   * Replaces the schedule without regenerating it. In a parcelada entry the
   * total follows the installments, so editing one updates the value at the
   * top; the schedule key is moved along with it so that change doesn't
   * throw the edits away.
   */
  function replaceInstallments(next: Installment[]) {
    setInstallments(next)
    const nextDraft = withInstallmentsTotal(draft, next)
    if (nextDraft !== draft) {
      setDraft(nextDraft)
      setLastKey(scheduleKey(nextDraft))
    }
    setErrors((current) => ({ ...current, installments: undefined, totalAmount: undefined }))
  }

  function updateInstallment(installmentNumber: number, patch: Partial<Pick<Installment, "dueDate" | "amount">>) {
    replaceInstallments(
      installments.map((installment) =>
        installment.installmentNumber === installmentNumber ? { ...installment, ...patch } : installment,
      ),
    )
  }

  function showErrors(next: FieldErrors) {
    setErrors(next)
    const first = FIELD_ORDER.find((field) => next[field])
    if (!first) return
    if (first === "installments") setEditingInstallments(true)
    // After the errors render: bring the first one into view and focus it.
    requestAnimationFrame(() => {
      const container = bodyRef.current?.querySelector<HTMLElement>(`[data-field="${first}"]`)
      container?.scrollIntoView({ block: "center", behavior: "smooth" })
      container?.querySelector<HTMLElement>("input, button")?.focus({ preventScroll: true })
    })
  }

  async function save(registerAnother: boolean) {
    if (pending) return
    setFormError(null)

    const payload = buildPayload(effectiveDraft, installments)
    const schema = isSale ? saleInputSchema : expenseInputSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0])
        if (isFieldKey(field) && !next[field]) next[field] = issue.message
      }
      if (Object.keys(next).length > 0) {
        showErrors(next)
        return
      }
    }

    setPending(true)
    const form = new FormData()
    form.set("payload", JSON.stringify(payload))
    let result: Awaited<ReturnType<typeof createSaleAction>>
    try {
      result = await (isSale ? createSaleAction(form) : createExpenseAction(form))
    } catch {
      // The request itself failed (network, or the server restarting
      // mid-deploy). Nothing was saved, and what was typed is still here.
      setPending(false)
      setFormError("Não foi possível falar com o servidor. Nada foi salvo; tente de novo.")
      return
    }
    setPending(false)

    if (!result.ok) {
      if (isFieldKey(result.field)) showErrors({ [result.field]: result.error })
      else setFormError(result.error)
      return
    }

    toast.success(isSale ? "Venda registrada." : "Despesa registrada.", {
      action: {
        label: "Ver",
        onClick: () => router.push(toOrg(isSale ? "/receivables" : "/payables")),
      },
    })

    if (registerAnother) {
      setDraft(draftForNext(effectiveDraft, businessToday()))
      setErrors({})
      setEditingInstallments(false)
      amountRef.current?.focus()
      return
    }
    onSaved()
  }

  // Listened on the document, not the form: focus can fall back to <body>
  // (e.g. after the focused button is removed) and the shortcut must still work.
  const onSaveShortcut = React.useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
    // A quick-add dialog on top of the sheet has its own submit.
    if (document.querySelector('[data-slot="dialog-content"]')) return
    event.preventDefault()
    void save(false)
  })
  React.useEffect(() => {
    document.addEventListener("keydown", onSaveShortcut)
    return () => document.removeEventListener("keydown", onSaveShortcut)
  }, [])

  const amountDisplay =
    draft.amount > 0
      ? (draft.amount / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : ""

  const showSchedule = installments.length > 1 || recurring
  const anyEdited = installments.some((installment, index) => isEdited(installment, baseline[index]))

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetTitle className="sr-only">{isSale ? "Nova venda" : "Nova despesa"}</SheetTitle>
      <SheetDescription className="sr-only">
        Registre {isSale ? "uma venda" : "uma despesa"} sem sair da tela atual.
      </SheetDescription>

      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <Tabs
          value={draft.kind}
          onValueChange={(value) => {
            setDraft((current) => switchKind(current, value as EntryKind))
            setErrors({})
          }}
        >
          <TabsList>
            <TabsTrigger value="sale" className="px-3">
              <span className="size-2 rounded-full bg-positive" aria-hidden />
              Venda
            </TabsTrigger>
            <TabsTrigger value="expense" className="px-3">
              <span className="size-2 rounded-full bg-negative" aria-hidden />
              Despesa
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
          <XIcon />
        </Button>
      </div>

      <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pt-4 pb-6">
        {loadError && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não foi possível carregar clientes, categorias e contas.
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              Tentar de novo
            </Button>
          </div>
        )}

        <div data-field="totalAmount" className="flex flex-col gap-1">
          <label htmlFor="entry-amount" className="text-xs font-medium text-muted-foreground">
            {amountLabel}
          </label>
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-lg font-semibold whitespace-nowrap text-muted-foreground" aria-hidden>
              {isSale ? "+" : "−"} R$
            </span>
            <input
              ref={amountRef}
              id="entry-amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0,00"
              aria-invalid={errors.totalAmount ? true : undefined}
              value={amountDisplay}
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, "")
                update({ amount: digits === "" ? 0 : Number(digits) }, "totalAmount", "allocations")
              }}
              className={cn(
                "w-full min-w-0 bg-transparent text-4xl font-extrabold tracking-tight tabular-nums outline-none placeholder:text-muted-foreground/40",
                isSale ? "text-positive" : "text-negative",
                // Saving without a value turns the empty "0,00" red.
                errors.totalAmount && "text-destructive placeholder:text-destructive",
              )}
            />
          </div>
          {errors.totalAmount && <p className="text-xs text-destructive">{errors.totalAmount}</p>}
        </div>

        <div data-field="description" className="flex flex-col gap-1">
          <Input
            id="entry-description"
            aria-label="Descrição"
            placeholder={isSale ? "Descrição da venda" : "Descrição da despesa"}
            aria-invalid={errors.description ? true : undefined}
            value={draft.description}
            onChange={(event) => update({ description: event.target.value }, "description")}
            className="h-10 rounded-none border-0 border-b border-dashed bg-transparent px-0 text-base font-semibold shadow-none focus-visible:border-solid focus-visible:border-primary focus-visible:ring-0 aria-invalid:ring-0 md:text-base dark:bg-transparent dark:aria-invalid:ring-0"
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>

        <div className="flex flex-col">
          <PropertyRow icon={UserIcon} label={isSale ? "Cliente" : "Contato"} field="contactId" error={errors.contactId}>
            <SearchableSelect
              className={cn(ghostControl, errors.contactId && "border-destructive")}
              options={contactOptions}
              value={draft.contactId}
              onValueChange={(contactId) => update({ contactId }, "contactId")}
              placeholder={loadingPlaceholder ?? (isSale ? "Selecione o cliente" : "Selecione o contato")}
              footer={
                <QuickAddContactDialog
                  key={draft.kind}
                  contactType={isSale ? "CLIENT" : "SUPPLIER"}
                  triggerLabel={isSale ? "Novo cliente" : "Novo fornecedor"}
                  dialogTitle={isSale ? "Novo cliente" : "Novo fornecedor"}
                  onCreated={(contact) => {
                    addContact(contact)
                    update({ contactId: contact.id }, "contactId")
                  }}
                />
              }
            />
          </PropertyRow>

          <PropertyRow icon={TagIcon} label="Categoria" field="categoryId" error={errors.categoryId}>
            <SearchableSelect
              className={cn(ghostControl, errors.categoryId && "border-destructive")}
              groups={categoryGroups}
              value={draft.categoryId}
              onValueChange={(categoryId) => update({ categoryId }, "categoryId")}
              placeholder={loadingPlaceholder ?? "Selecione a categoria"}
              footer={
                <NewSaleCategoryDialog
                  key={draft.kind}
                  categories={categories}
                  defaultType={isSale ? "INCOME" : "EXPENSE"}
                  onCreated={(category) => {
                    onOptionsChange((current) => ({ ...current, categories: [...current.categories, category] }))
                    update({ categoryId: category.id }, "categoryId")
                  }}
                />
              }
            />
          </PropertyRow>

          <PropertyRow icon={RepeatIcon} label="Repetição">
            <div className="flex h-9 items-center px-2.5 sm:px-1">
              <ToggleGroup
                variant="outline"
                size="sm"
                spacing={0}
                aria-label="Repetição"
                value={[draft.repetition]}
                onValueChange={(value) => {
                  if (!value[0]) return
                  setEditingInstallments(false)
                  update({ repetition: value[0] as Repetition }, "installmentsCount", "recurrenceEndDate", "installments")
                }}
              >
                {(Object.keys(repetitionLabel) as Repetition[]).map((repetition) => (
                  <ToggleGroupItem key={repetition} value={repetition}>
                    {repetitionLabel[repetition]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </PropertyRow>

          {draft.repetition === "installments" && (
            <PropertyRow icon={ListOrderedIcon} label="Parcelas" field="installmentsCount" error={errors.installmentsCount}>
              <div className="flex flex-wrap items-center gap-1">
                <SearchableSelect
                  className={cn(ghostControl, "w-24")}
                  options={installmentCountOptions}
                  value={String(draft.installmentsCount)}
                  onValueChange={(value) => value && update({ installmentsCount: Number(value) }, "installmentsCount")}
                />
                <FrequencySelect value={draft.frequency} onChange={(frequency) => update({ frequency })} />
                {installments.length > 1 && draft.amount > 0 && (
                  <span className="px-1 text-sm text-muted-foreground tabular-nums">
                    {anyEdited ? "com valores editados" : `de ${formatBRL(baseline[0]?.amount ?? 0)}`}
                  </span>
                )}
              </div>
            </PropertyRow>
          )}

          {recurring && (
            <>
              <PropertyRow icon={RepeatIcon} label="Frequência">
                <FrequencySelect value={draft.frequency} onChange={(frequency) => update({ frequency })} />
              </PropertyRow>
              <PropertyRow icon={FlagIcon} label="Término" field="recurrenceEndDate" error={errors.recurrenceEndDate}>
                <div className="flex flex-wrap items-center gap-1">
                  <Select
                    value={draft.recurrenceEndDate ? "date" : "open"}
                    onValueChange={(value) =>
                      update(
                        { recurrenceEndDate: value === "date" ? oneYearAfter(draft.firstDueDate) : null },
                        "recurrenceEndDate",
                      )
                    }
                  >
                    <SelectTrigger className={cn(ghostControl, "w-auto")} aria-label="Término">
                      <SelectValue>
                        {(value: string) => (value === "date" ? "Em uma data" : "Sem data de término")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Sem data de término</SelectItem>
                      <SelectItem value="date">Em uma data</SelectItem>
                    </SelectContent>
                  </Select>
                  {draft.recurrenceEndDate && (
                    <div className="w-36">
                      <DateButton
                        ariaLabel="Data de término"
                        value={draft.recurrenceEndDate}
                        invalid={Boolean(errors.recurrenceEndDate)}
                        onChange={(recurrenceEndDate) => update({ recurrenceEndDate }, "recurrenceEndDate")}
                      />
                    </div>
                  )}
                </div>
              </PropertyRow>
            </>
          )}

          <PropertyRow icon={CalendarIcon} label={dateLabel} field="firstDueDate" error={errors.firstDueDate}>
            <DateButton
              ariaLabel={dateLabel}
              value={draft.firstDueDate}
              invalid={Boolean(errors.firstDueDate)}
              onChange={(firstDueDate) => update({ firstDueDate }, "firstDueDate", "recurrenceEndDate")}
            />
          </PropertyRow>

          <PropertyRow icon={CreditCardIcon} label="Forma de pagamento" field="paymentMethod" error={errors.paymentMethod}>
            <Select
              value={draft.paymentMethod}
              onValueChange={(value) => value && update({ paymentMethod: value as PaymentMethod }, "paymentMethod")}
            >
              <SelectTrigger
                className={ghostControl}
                aria-label="Forma de pagamento"
                aria-invalid={errors.paymentMethod ? true : undefined}
              >
                <SelectValue>
                  {(value: PaymentMethod | "") =>
                    value ? paymentMethodLabel[value] : <span className="text-muted-foreground">Selecione</span>
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((method) => (
                  <SelectItem key={method} value={method}>
                    {paymentMethodLabel[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </PropertyRow>

          <PropertyRow
            icon={LandmarkIcon}
            label={isSale ? "Conta de recebimento" : "Conta de pagamento"}
            field="bankAccountId"
            error={errors.bankAccountId}
          >
            <SearchableSelect
              className={cn(ghostControl, errors.bankAccountId && "border-destructive")}
              options={bankAccountOptions}
              value={effectiveDraft.bankAccountId}
              onValueChange={(bankAccountId) => update({ bankAccountId }, "bankAccountId")}
              placeholder={loadingPlaceholder ?? "Selecione a conta"}
              footer={
                <NewBankAccountDialog
                  onCreated={(account) => {
                    onOptionsChange((current) => ({ ...current, bankAccounts: [...current.bankAccounts, account] }))
                    update({ bankAccountId: account.id }, "bankAccountId")
                  }}
                />
              }
            />
          </PropertyRow>
        </div>

        {showSchedule && (
          <section data-field="installments" className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {recurring ? (isSale ? "Próximas cobranças" : "Próximos pagamentos") : "Parcelas"}
              </h3>
              <div className="flex items-center gap-1">
                {anyEdited && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => replaceInstallments(baseline)}
                  >
                    Desfazer edições
                  </Button>
                )}
                {installments.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary dark:text-capi-lilac"
                    aria-expanded={editingInstallments}
                    onClick={() => setEditingInstallments((open) => !open)}
                  >
                    {editingInstallments ? "Recolher" : `Ver e editar ${installments.length}`}
                  </Button>
                )}
              </div>
            </div>
            {installments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Informe o valor e as datas para ver {recurring ? "as cobranças" : "as parcelas"}.
              </p>
            ) : editingInstallments ? (
              <InstallmentsEditor installments={installments} generated={baseline} onChange={updateInstallment} />
            ) : (
              <InstallmentChips installments={installments} generated={baseline} />
            )}
            {recurring && !draft.recurrenceEndDate && (
              <p className="text-xs text-muted-foreground">
                Sem data de término, mantemos sempre as próximas {RECURRING_ROLLING_WINDOW}{" "}
                {isSale ? "cobranças" : "parcelas"} geradas. Ao conciliar uma, criamos a seguinte.
              </p>
            )}
            {errors.installments && <p className="text-xs text-destructive">{errors.installments}</p>}
          </section>
        )}

        {isSale && (
          <AllocationEditor
            draft={draft}
            beneficiaries={beneficiaries}
            error={errors.allocations ?? errors.allocationMode}
            onChange={(patch) => update(patch, "allocations", "allocationMode")}
            onBeneficiaryCreated={addContact}
          />
        )}
      </div>

      {formError && (
        <p role="alert" className="mx-5 mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <span className="mr-auto hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Kbd>{isApplePlatform() ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>Enter</Kbd>
          salva
        </span>
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancelar
        </Button>
        <div className="flex">
          <Button type="button" className="rounded-r-none" onClick={() => void save(false)} disabled={pending}>
            {pending ? "Salvando..." : `Salvar ${noun}`}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  className="rounded-l-none border-l-primary-foreground/25"
                  disabled={pending}
                  aria-label="Mais opções de salvar"
                />
              }
            >
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => void save(true)}>
                Salvar e registrar {isSale ? "outra venda" : "outra despesa"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function FrequencySelect({
  value,
  onChange,
}: {
  value: BillingFrequency
  onChange: (frequency: BillingFrequency) => void
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next as BillingFrequency)}>
      <SelectTrigger className={cn(ghostControl, "w-auto")} aria-label="Periodicidade">
        <SelectValue>{(current: BillingFrequency) => billingFrequencyLabel[current]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(billingFrequencyLabel) as BillingFrequency[]).map((frequency) => (
          <SelectItem key={frequency} value={frequency}>
            {billingFrequencyLabel[frequency]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
