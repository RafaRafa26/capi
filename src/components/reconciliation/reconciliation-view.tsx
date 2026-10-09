"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  LandmarkIcon,
  FileTextIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import {
  createAndSettlePayableAction,
  createAndSettleReceivableAction,
  createAndSettleTransferAction,
  createSettlementAction,
  deleteBankTransactionAction,
  getMatchInfoForTransactionsAction,
  listBankTransactionsAction,
} from "@/app/o/[orgId]/(app)/reconciliation/actions"
import { ReconciliationCategoryPicker, ReconciliationContactPicker } from "@/components/reconciliation/entry-pickers"
import { ImportOfxButton } from "@/components/reconciliation/import-ofx-button"
import { ReconciliationMatchModal } from "@/components/reconciliation/reconciliation-match-modal"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatBankAccountLabel, formatBankAccountNumbers, formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BankAccount } from "@/modules/bank-accounts/types"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import { directionForTransactionAmount } from "@/modules/settlements/domain"
import type { TransactionMatchInfo } from "@/modules/settlements/types"
import type { BankTransaction } from "@/modules/statements/types"
import { useOrgPath } from "@/hooks/use-org-path"
import { toast } from "sonner"

type FiltroTipo = "todas" | "entrada" | "saida"
type QuickFormMode = "lancamento" | "transferencia"

interface QuickForm {
  mode: QuickFormMode
  contactId: string
  categoryId: string
  description: string
  // Só no modo "Transferência" (RN-15): a conta contrária. O valor é o da
  // transação e a descrição é gerada no servidor.
  transferAccountId: string
}

export function ReconciliationView({
  bankAccount,
  bankAccounts,
  contacts: initialContacts,
  categories: initialCategories,
}: {
  bankAccount: BankAccount
  bankAccounts: BankAccount[]
  contacts: Contact[]
  categories: Category[]
}) {
  const toOrg = useOrgPath()
  const bankAccountId = bankAccount.id
  const [transacoes, setTransacoes] = React.useState<BankTransaction[]>([])
  const [matchInfo, setMatchInfo] = React.useState<Record<string, TransactionMatchInfo>>({})
  const [carregando, setCarregando] = React.useState(true)
  const [filtroTipo, setFiltroTipo] = React.useState<FiltroTipo>("todas")
  const [busca, setBusca] = React.useState("")
  const [modalTransactionId, setModalTransactionId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  // Locais para que contato/categoria criados aqui entrem na hora nas listas.
  const [contacts, setContacts] = React.useState(initialContacts)
  const [categories, setCategories] = React.useState(initialCategories)
  const addContact = React.useCallback((contact: Contact) => setContacts((prev) => [...prev, contact]), [])
  const addCategory = React.useCallback((category: Category) => setCategories((prev) => [...prev, category]), [])

  const refreshMatchInfo = React.useCallback(async (ids: string[]) => {
    if (ids.length === 0) return
    const response = await getMatchInfoForTransactionsAction(ids)
    if (!response.ok) return
    setMatchInfo((prev) => {
      const next = { ...prev }
      for (const info of response.data) next[info.bankTransactionId] = info
      return next
    })
  }, [])

  function handleImported() {
    setCarregando(true)
    setRefreshKey((key) => key + 1)
  }

  React.useEffect(() => {
    let ignorar = false
    listBankTransactionsAction(bankAccountId).then(async (response) => {
      if (ignorar) return
      const dados = response.ok ? response.data : []
      setTransacoes(dados)
      setCarregando(false)
      await refreshMatchInfo(dados.map((t) => t.id))
    })
    return () => {
      ignorar = true
    }
  }, [bankAccountId, refreshKey, refreshMatchInfo])

  const filtradasPorBusca = React.useMemo(() => {
    return transacoes.filter((t) => t.description.toLowerCase().includes(busca.toLowerCase()))
  }, [transacoes, busca])

  const contagens = {
    todas: filtradasPorBusca.length,
    entrada: filtradasPorBusca.filter((t) => t.amount >= 0).length,
    saida: filtradasPorBusca.filter((t) => t.amount < 0).length,
  }

  const visiveis = React.useMemo(() => {
    const porTipo = filtradasPorBusca.filter(
      (t) => filtroTipo === "todas" || (filtroTipo === "entrada" ? t.amount >= 0 : t.amount < 0),
    )
    return [...porTipo].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [filtradasPorBusca, filtroTipo])

  // Conciliada, a transação sai daqui — passa a aparecer no extrato da conta,
  // que é de onde se desconcilia.
  const removeReconciled = React.useCallback((transactionId: string) => {
    setTransacoes((prev) => prev.filter((t) => t.id !== transactionId))
  }, [])

  const removerTransacao = React.useCallback(async (id: string) => {
    const response = await deleteBankTransactionAction(id)
    if (response.ok) {
      setTransacoes((prev) => prev.filter((t) => t.id !== id))
    }
  }, [])

  const modalTransaction = transacoes.find((t) => t.id === modalTransactionId) ?? null

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={toOrg("/accounts")}
            className="flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <div>
            <p className="text-sm font-semibold">{bankAccount.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatBankAccountNumbers(bankAccount)}
            </p>
          </div>
        </div>
        <ImportOfxButton bankAccountId={bankAccountId} onImported={handleImported} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            spacing={0}
            multiple={false}
            value={[filtroTipo]}
            onValueChange={(value) => value[0] && setFiltroTipo(value[0] as FiltroTipo)}
          >
            <ToggleGroupItem value="todas">Todas ({contagens.todas})</ToggleGroupItem>
            <ToggleGroupItem value="entrada">Entradas ({contagens.entrada})</ToggleGroupItem>
            <ToggleGroupItem value="saida">Saídas ({contagens.saida})</ToggleGroupItem>
          </ToggleGroup>

          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar lançamento..."
              className="w-56 pl-8"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1 text-sm font-medium text-muted-foreground">
        <div className="flex flex-1 items-center gap-2">
          <LandmarkIcon className="size-4" />
          Lançamentos do banco
        </div>
        <div className="flex flex-1 items-center gap-2">
          <FileTextIcon className="size-4" />
          Lançamentos do Capi
        </div>
        <div className="w-9 shrink-0" />
      </div>

      <div className="space-y-3">
        {carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {visiveis.map((transacao) => (
              <ReconciliationRow
                key={transacao.id}
                transacao={transacao}
                info={matchInfo[transacao.id]}
                bankAccountId={bankAccountId}
                bankAccounts={bankAccounts}
                contacts={contacts}
                categories={categories}
                onReconciled={removeReconciled}
                onRemove={removerTransacao}
                onOpenModal={setModalTransactionId}
                onContactCreated={addContact}
                onCategoryCreated={addCategory}
              />
            ))}
            {visiveis.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {transacoes.length === 0
                  ? "Nenhuma transação pendente de conciliação."
                  : "Nenhum lançamento encontrado para os filtros selecionados."}
              </p>
            )}
          </>
        )}
      </div>

      {modalTransaction && (
        <ReconciliationMatchModal
          key={modalTransaction.id}
          open
          onClose={() => setModalTransactionId(null)}
          onSettled={() => removeReconciled(modalTransaction.id)}
          bankTransactionId={modalTransaction.id}
          direction={directionForTransactionAmount(modalTransaction.amount)}
          transactionAmount={modalTransaction.amount}
          bankAccountId={bankAccountId}
          contacts={contacts}
          categories={categories}
          onContactCreated={addContact}
          onCategoryCreated={addCategory}
        />
      )}
    </div>
  )
}

const emptyQuickForm = (): QuickForm => ({
  mode: "lancamento",
  contactId: "",
  categoryId: "",
  description: "",
  transferAccountId: "",
})

/**
 * Um card da conciliação. Memoizado e com o formulário rápido no próprio
 * estado: digitar a descrição redesenha só este card, não a lista inteira
 * (cada card tem seus seletores de contato/categoria, que pesam).
 */
const ReconciliationRow = React.memo(function ReconciliationRow({
  transacao,
  info,
  bankAccountId,
  bankAccounts,
  contacts,
  categories,
  onReconciled,
  onRemove,
  onOpenModal,
  onContactCreated,
  onCategoryCreated,
}: {
  transacao: BankTransaction
  info: TransactionMatchInfo | undefined
  bankAccountId: string
  bankAccounts: BankAccount[]
  contacts: Contact[]
  categories: Category[]
  onReconciled: (transactionId: string) => void
  onRemove: (transactionId: string) => void
  onOpenModal: (transactionId: string) => void
  onContactCreated: (contact: Contact) => void
  onCategoryCreated: (category: Category) => void
}) {
  const [quickForm, setQuickForm] = React.useState(emptyQuickForm)
  const [isPending, setIsPending] = React.useState(false)
  const isEntrada = transacao.amount >= 0
  const direction = directionForTransactionAmount(transacao.amount)
  const contaContrariaLabel = isEntrada ? "Conta de origem" : "Conta de destino"

  function updateQuickForm(patch: Partial<QuickForm>) {
    setQuickForm((prev) => ({ ...prev, ...patch }))
  }

  async function confirmSuggestion(entryId: string) {
    setIsPending(true)
    const response = await createSettlementAction({
      entryId,
      bankTransactionId: transacao.id,
      settledAmount: Math.abs(transacao.amount),
      settledAt: transacao.date,
    })
    setIsPending(false)
    if (response.ok) onReconciled(transacao.id)
    else toast.error(response.error)
  }

  async function confirmTransfer() {
    if (!quickForm.transferAccountId) return

    setIsPending(true)
    const response = await createAndSettleTransferAction({
      bankTransactionId: transacao.id,
      counterpartBankAccountId: quickForm.transferAccountId,
    })
    setIsPending(false)
    if (response.ok) onReconciled(transacao.id)
    else toast.error(response.error)
  }

  async function confirmQuickEntry() {
    if (quickForm.mode === "transferencia") return confirmTransfer()
    if (!quickForm.contactId || !quickForm.categoryId || !quickForm.description.trim()) return

    setIsPending(true)
    const action = direction === "PAYABLE" ? createAndSettlePayableAction : createAndSettleReceivableAction
    const response = await action({
      contactId: quickForm.contactId,
      categoryId: quickForm.categoryId,
      bankAccountId,
      description: quickForm.description.trim(),
      bankTransactionId: transacao.id,
      settledAmount: Math.abs(transacao.amount),
      settledAt: transacao.date,
    })
    setIsPending(false)
    if (response.ok) onReconciled(transacao.id)
    else toast.error(response.error)
  }

  return (
    <div className="flex items-stretch overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isEntrada ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500",
            )}
          >
            {isEntrada ? <ArrowDownLeftIcon className="size-4" /> : <ArrowUpRightIcon className="size-4" />}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">{transacao.description}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(transacao.date)} · {isEntrada ? "Entrada" : "Saída"}
            </p>
            <p className={cn("text-sm font-semibold", isEntrada ? "text-emerald-500" : "text-red-500")}>
              {isEntrada ? "" : "- "}
              {formatBRL(Math.abs(transacao.amount))}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRemove(transacao.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <div className="w-px shrink-0 bg-border" />

      <div className="flex min-h-38 flex-1 flex-col justify-center gap-2 p-4">
        {info && info.suggestions.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Sugestão automática</span>
              <button
                type="button"
                onClick={() => onOpenModal(transacao.id)}
                className="shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Buscar / Criar Vários
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{info.suggestions[0].contactName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {info.suggestions[0].description} · {formatDate(info.suggestions[0].dueDate)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{formatBRL(info.suggestions[0].amount)}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <ToggleGroup
                variant="outline"
                spacing={0}
                multiple={false}
                value={[quickForm.mode]}
                onValueChange={(value) =>
                  value[0] && updateQuickForm({ mode: value[0] as QuickFormMode })
                }
              >
                <ToggleGroupItem value="lancamento" size="sm" className="text-xs">
                  {direction === "PAYABLE" ? "Pagamento" : "Recebimento"}
                </ToggleGroupItem>
                <ToggleGroupItem value="transferencia" size="sm" className="text-xs">
                  Transferência
                </ToggleGroupItem>
              </ToggleGroup>
              <button
                type="button"
                onClick={() => onOpenModal(transacao.id)}
                className="shrink-0 rounded-md border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Buscar / Criar Vários
              </button>
            </div>

            {quickForm.mode === "transferencia" ? (
              <Select
                value={quickForm.transferAccountId}
                onValueChange={(value) => {
                  if (!value) return
                  const contraria = bankAccounts.find((a) => a.id === value)
                  const esta = bankAccounts.find((a) => a.id === bankAccountId)
                  // Saída: esta conta é a origem; entrada: é o destino.
                  const [origem, destino] = isEntrada ? [contraria, esta] : [esta, contraria]
                  updateQuickForm({
                    transferAccountId: value,
                    description: origem && destino ? `Transferência de ${origem.name} para ${destino.name}` : "",
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={contaContrariaLabel}>
                    {(value: string) => {
                      const account = bankAccounts.find((a) => a.id === value)
                      return account ? formatBankAccountLabel(account) : contaContrariaLabel
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.filter((account) => account.id !== bankAccountId).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {formatBankAccountLabel(account)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <ReconciliationContactPicker
                  contacts={contacts}
                  direction={direction}
                  value={quickForm.contactId}
                  onValueChange={(contactId) => updateQuickForm({ contactId })}
                  onCreated={(contact) => {
                    onContactCreated(contact)
                    updateQuickForm({ contactId: contact.id })
                  }}
                />
                <ReconciliationCategoryPicker
                  categories={categories}
                  direction={direction}
                  value={quickForm.categoryId}
                  onValueChange={(categoryId) => updateQuickForm({ categoryId })}
                  onCreated={(category) => {
                    onCategoryCreated(category)
                    updateQuickForm({ categoryId: category.id })
                  }}
                />
              </div>
            )}
            <Input
              placeholder="Descrição"
              value={quickForm.description}
              // Na transferência a descrição é gerada (RN-15).
              readOnly={quickForm.mode === "transferencia"}
              onChange={(event) => updateQuickForm({ description: event.target.value })}
            />
          </div>
        )}
      </div>

      <div className="flex w-9 shrink-0 items-center justify-center">
        <button
          type="button"
          disabled={
            isPending ||
            ((info?.suggestions.length ?? 0) === 0 &&
              (quickForm.mode === "transferencia"
                ? !quickForm.transferAccountId
                : !(quickForm.contactId && quickForm.categoryId && quickForm.description.trim())))
          }
          onClick={() =>
            info && info.suggestions.length > 0
              ? confirmSuggestion(info.suggestions[0].id)
              : confirmQuickEntry()
          }
          className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
        >
          <CheckIcon className="size-4" />
        </button>
      </div>
    </div>
  )
})
