"use client"

import * as React from "react"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  LandmarkIcon,
  FileTextIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"

import {
  createAndSettlePayableAction,
  createAndSettleReceivableAction,
  createSettlementAction,
  deleteBankTransactionAction,
  getMatchInfoForTransactionsAction,
  listBankTransactionsAction,
  undoSettlementAction,
} from "@/app/(app)/reconciliation/actions"
import { ImportOfxButton } from "@/components/reconciliation/import-ofx-button"
import { ReconciliationMatchModal } from "@/components/reconciliation/reconciliation-match-modal"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BankAccount } from "@/modules/bank-accounts/types"
import type { Category } from "@/modules/categories/types"
import type { Contact } from "@/modules/contacts/types"
import { directionForTransactionAmount } from "@/modules/settlements/domain"
import type { EntryType, TransactionMatchInfo } from "@/modules/settlements/types"
import type { BankTransaction } from "@/modules/statements/types"

type FiltroTipo = "todas" | "entrada" | "saida"
type QuickFormMode = "lancamento" | "transferencia"

// Rótulos do lançamento já conciliado no Capi (lado direito da tela).
const entryTypeLabels: Record<EntryType, { titulo: string; subtitulo: string }> = {
  RECEIVABLE: { titulo: "Recebimento", subtitulo: "Contas a receber" },
  PAYABLE: { titulo: "Pagamento", subtitulo: "Contas a pagar" },
  TRANSFER: { titulo: "Transferência", subtitulo: "Transferência" },
}

interface QuickForm {
  mode: QuickFormMode
  contactId: string
  categoryId: string
  description: string
  // "Transferência" ainda não tem back-end (RN a definir) — o select só existe
  // no visual por enquanto, e o botão de confirmar fica sempre desabilitado
  // nesse modo (ver render do botão de check mais abaixo).
  transferAccountId: string
}

export function ReconciliationView({
  bankAccounts,
  contacts,
  categories,
}: {
  bankAccounts: BankAccount[]
  contacts: Contact[]
  categories: Category[]
}) {
  const [bankAccountId, setBankAccountId] = React.useState("")
  const [transacoes, setTransacoes] = React.useState<BankTransaction[]>([])
  const [matchInfo, setMatchInfo] = React.useState<Record<string, TransactionMatchInfo>>({})
  const [carregando, setCarregando] = React.useState(false)
  const [filtroTipo, setFiltroTipo] = React.useState<FiltroTipo>("todas")
  const [busca, setBusca] = React.useState("")
  const [quickForms, setQuickForms] = React.useState<Record<string, QuickForm>>({})
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set())
  const [modalTransactionId, setModalTransactionId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const expenseCategories = React.useMemo(() => categories.filter((c) => c.type === "EXPENSE"), [categories])
  const incomeCategories = React.useMemo(() => categories.filter((c) => c.type === "INCOME"), [categories])

  const emptyQuickForm = React.useCallback(
    (): QuickForm => ({
      mode: "lancamento",
      contactId: "",
      categoryId: "",
      description: "",
      transferAccountId: bankAccountId,
    }),
    [bankAccountId],
  )

  function updateQuickForm(transactionId: string, patch: Partial<QuickForm>) {
    setQuickForms((prev) => ({ ...prev, [transactionId]: { ...(prev[transactionId] ?? emptyQuickForm()), ...patch } }))
  }

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

  function handleBankAccountChange(accountId: string) {
    setBankAccountId(accountId)
    setCarregando(true)
  }

  function handleImported() {
    setCarregando(true)
    setRefreshKey((key) => key + 1)
  }

  React.useEffect(() => {
    if (!bankAccountId) return
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

  function markPending(id: string, pending: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev)
      if (pending) next.add(id)
      else next.delete(id)
      return next
    })
  }

  async function confirmSuggestion(transaction: BankTransaction, entryId: string) {
    markPending(transaction.id, true)
    await createSettlementAction({
      entryId,
      bankTransactionId: transaction.id,
      settledAmount: Math.abs(transaction.amount),
      settledAt: transaction.date,
    })
    await refreshMatchInfo([transaction.id])
    markPending(transaction.id, false)
  }

  async function confirmQuickEntry(transaction: BankTransaction) {
    const form = quickForms[transaction.id] ?? emptyQuickForm()
    if (form.mode !== "lancamento") return
    if (!form.contactId || !form.categoryId || !form.description.trim()) return

    markPending(transaction.id, true)
    const action =
      directionForTransactionAmount(transaction.amount) === "PAYABLE"
        ? createAndSettlePayableAction
        : createAndSettleReceivableAction
    await action({
      contactId: form.contactId,
      categoryId: form.categoryId,
      bankAccountId,
      description: form.description.trim(),
      bankTransactionId: transaction.id,
      settledAmount: Math.abs(transaction.amount),
      settledAt: transaction.date,
    })
    await refreshMatchInfo([transaction.id])
    markPending(transaction.id, false)
  }

  async function handleUndo(settlementId: string, transactionId: string) {
    markPending(transactionId, true)
    await undoSettlementAction(settlementId)
    await refreshMatchInfo([transactionId])
    markPending(transactionId, false)
  }

  async function removerTransacao(id: string) {
    const response = await deleteBankTransactionAction(id)
    if (response.ok) {
      setTransacoes((prev) => prev.filter((t) => t.id !== id))
    }
  }

  const modalTransaction = transacoes.find((t) => t.id === modalTransactionId) ?? null

  return (
    <div className="flex flex-1 flex-col gap-4">
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

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Conta:</span>
            <Select
              value={bankAccountId}
              onValueChange={(value) => value && handleBankAccountChange(value)}
              disabled={bankAccounts.length === 0}
            >
              <SelectTrigger className="w-fit">
                <SelectValue placeholder="Selecione uma conta">
                  {(value: string) =>
                    bankAccounts.find((account) => account.id === value)?.name ??
                    (bankAccounts.length === 0 ? "Nenhuma conta cadastrada" : "Selecione uma conta")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ImportOfxButton bankAccountId={bankAccountId} onImported={handleImported} />
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
        {!bankAccountId ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Selecione uma conta bancária para ver os lançamentos.</p>
        ) : carregando ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {visiveis.map((transacao) => {
              const isEntrada = transacao.amount >= 0
              const info = matchInfo[transacao.id]
              const isPending = pendingIds.has(transacao.id)
              const direction = directionForTransactionAmount(transacao.amount)
              const quickForm = quickForms[transacao.id] ?? emptyQuickForm()

              return (
                <div key={transacao.id} className="flex items-stretch overflow-hidden rounded-lg border bg-card">
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
                        onClick={() => removerTransacao(transacao.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="w-px shrink-0 bg-border" />

                  <div className="flex min-h-38 flex-1 flex-col justify-center gap-2 p-4">
                    {info && info.matches.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {info.matches.map((match) => {
                          const labels = entryTypeLabels[match.entryType]
                          return (
                            <div key={match.settlementId} className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {labels.titulo} — {match.contactName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {labels.subtitulo} · {formatDate(match.dueDate)} · {match.categoryName}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => handleUndo(match.settlementId, transacao.id)}
                                  disabled={isPending}
                                  className="mt-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                  Desvincular
                                </button>
                              </div>
                              <span className="shrink-0 text-sm font-semibold">{formatBRL(match.settledAmount)}</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : info && info.suggestions.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Sugestão automática</span>
                          <button
                            type="button"
                            onClick={() => setModalTransactionId(transacao.id)}
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
                              value[0] && updateQuickForm(transacao.id, { mode: value[0] as QuickFormMode })
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
                            onClick={() => setModalTransactionId(transacao.id)}
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
                              const origem = bankAccounts.find((a) => a.id === bankAccountId)
                              const destino = bankAccounts.find((a) => a.id === value)
                              updateQuickForm(transacao.id, {
                                transferAccountId: value,
                                description:
                                  origem && destino ? `Transferência de ${origem.name} para ${destino.name}` : quickForm.description,
                              })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Conta de destino">
                                {(value: string) => {
                                  const account = bankAccounts.find((a) => a.id === value)
                                  return account
                                    ? `${account.name} — Ag ${account.branchNumber} / CC ${account.accountNumber}`
                                    : "Conta de destino"
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.name} — Ag {account.branchNumber} / CC {account.accountNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={quickForm.contactId}
                              onValueChange={(value) => value && updateQuickForm(transacao.id, { contactId: value })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Contato">
                                  {(value: string) => contacts.find((contact) => contact.id === value)?.name ?? "Contato"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {contacts.map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id}>
                                    {contact.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={quickForm.categoryId}
                              onValueChange={(value) => value && updateQuickForm(transacao.id, { categoryId: value })}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Categoria">
                                  {(value: string) => {
                                    const categoryList = direction === "PAYABLE" ? expenseCategories : incomeCategories
                                    return categoryList.find((category) => category.id === value)?.name ?? "Categoria"
                                  }}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(direction === "PAYABLE" ? expenseCategories : incomeCategories).map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Input
                          placeholder="Descrição"
                          value={quickForm.description}
                          onChange={(event) => updateQuickForm(transacao.id, { description: event.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex w-9 shrink-0 items-center justify-center">
                    {info && info.matches.length > 0 ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                        <CheckIcon className="size-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          isPending ||
                          quickForm.mode === "transferencia" ||
                          ((info?.suggestions.length ?? 0) === 0 &&
                            !(quickForm.contactId && quickForm.categoryId && quickForm.description.trim()))
                        }
                        onClick={() =>
                          info && info.suggestions.length > 0
                            ? confirmSuggestion(transacao, info.suggestions[0].id)
                            : confirmQuickEntry(transacao)
                        }
                        className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 transition-colors hover:bg-emerald-500/25 disabled:opacity-40"
                      >
                        <CheckIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {visiveis.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum lançamento encontrado para os filtros selecionados.
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
          onSettled={() => refreshMatchInfo([modalTransaction.id])}
          bankTransactionId={modalTransaction.id}
          direction={directionForTransactionAmount(modalTransaction.amount)}
          transactionAmount={modalTransaction.amount}
          bankAccountId={bankAccountId}
          contacts={contacts}
          categories={categories}
        />
      )}
    </div>
  )
}
