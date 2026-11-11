"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, CheckIcon, CopyIcon, FileDownIcon } from "lucide-react"

import { EntryDetailSheet } from "@/components/accounts/entry-detail-sheet"
import { PeriodFilter } from "@/components/accounts/period-filter"
import { CreditSummary } from "@/components/payout/credit-summary"
import {
  generatePayoutAction,
  getAccountEntryAction,
  getBeneficiaryStatementAction,
  listAvailableCreditsAction,
} from "@/app/o/[orgId]/(app)/payout/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useOrgPath } from "@/hooks/use-org-path"
import { getPeriodRange, type PeriodRange } from "@/lib/accounts/filter"
import { toParamDate } from "@/lib/accounts/params"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AccountEntry } from "@/modules/accounts/types"
import { sliceStatement } from "@/modules/payouts/statement"
import type { BeneficiaryCredit, BeneficiaryPosition, BeneficiaryStatement, PayoutSummary } from "@/modules/payouts/types"

export type FiltroSaldo = "todos" | "com-saldo" | "sem-saldo"

const colunas = "grid-cols-[1fr_160px_160px_160px_200px]"

function CampoCopiavel({ label, value, className }: { label: string; value: string; className?: string }) {
  const [copiado, setCopiado] = React.useState(false)
  // O cadastro do favorecido aceita dados bancários incompletos.
  if (!value) return null

  return (
    <div className={cn("space-y-1", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm">
        <span className="min-w-0 truncate">{value}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 1500)
          }}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {copiado ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
        </button>
      </div>
    </div>
  )
}

function GerarRepasseDialog({
  beneficiario,
  onClose,
  onDone,
}: {
  beneficiario: BeneficiaryPosition | null
  onClose: () => void
  onDone: (repasse: { beneficiario: BeneficiaryPosition; amount: number }) => void
}) {
  // Montado com `key` por favorecido (ver PayoutView), então o estado inicial
  // já nasce certo — nada de sincronizar formulário dentro de efeito.
  const [credits, setCredits] = React.useState<BeneficiaryCredit[] | null>(null)
  // Tudo marcado ao abrir: o caso comum continua sendo repassar o saldo inteiro.
  const [selecionados, setSelecionados] = React.useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = React.useState<Date>(() => new Date())
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const beneficiarioId = beneficiario?.beneficiaryId
  const lista = credits ?? []
  const total = lista.reduce((sum, credit) => (selecionados.has(credit.id) ? sum + credit.amount : sum), 0)
  const todosMarcados = lista.length > 0 && selecionados.size === lista.length
  const algunsMarcados = selecionados.size > 0 && !todosMarcados

  React.useEffect(() => {
    if (!beneficiarioId) return
    let ignore = false
    listAvailableCreditsAction(beneficiarioId).then((response) => {
      if (ignore) return
      if (!response.ok) {
        setError(response.error)
        return
      }
      setCredits(response.data)
      setSelecionados(new Set(response.data.map((credit) => credit.id)))
    })
    return () => {
      ignore = true
    }
  }, [beneficiarioId])

  function alternar(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function alternarTodos() {
    setSelecionados(todosMarcados ? new Set() : new Set(lista.map((credit) => credit.id)))
  }

  async function confirmar() {
    if (!beneficiario) return
    setPending(true)
    setError(null)
    const response = await generatePayoutAction({
      beneficiaryId: beneficiario.beneficiaryId,
      dueDate,
      credits: lista
        .filter((credit) => selecionados.has(credit.id))
        .map(({ settlementId, allocationId }) => ({ settlementId, allocationId })),
    })
    setPending(false)
    if (!response.ok) {
      setError(response.error)
      return
    }
    onDone({ beneficiario, amount: total })
  }

  return (
    <Dialog open={beneficiario !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerar repasse</DialogTitle>
        </DialogHeader>

        {beneficiario && (
          <>
            <p className="text-sm text-muted-foreground">
              {beneficiario.name}
              {beneficiario.document ? ` — ${beneficiario.document}` : ""}
            </p>

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Escolha os recebimentos que entram neste repasse
                </span>
                {lista.length > 0 && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {selecionados.size} de {lista.length} selecionado{lista.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              {lista.length > 0 && (
                <label className="flex cursor-pointer items-center gap-3 border-b py-2 text-sm font-medium">
                  <Checkbox checked={todosMarcados} indeterminate={algunsMarcados} onCheckedChange={alternarTodos} />
                  Selecionar todos
                </label>
              )}
              <ScrollArea className="h-56 pr-4">
                <div className="divide-y">
                  {lista.map((credit) => (
                    <label
                      key={credit.id}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-3 py-3 text-sm",
                        !selecionados.has(credit.id) && "text-muted-foreground",
                      )}
                    >
                      <Checkbox checked={selecionados.has(credit.id)} onCheckedChange={() => alternar(credit.id)} />
                      <CreditSummary credit={credit} />
                      <span className="shrink-0 font-medium">{formatBRL(credit.amount)}</span>
                    </label>
                  ))}
                  {credits === null && !error && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
                  )}
                  {credits !== null && credits.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhum recebimento conciliado para este favorecido.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex items-end justify-between gap-4 border-t pt-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Total do repasse</span>
                <span className="text-2xl font-semibold">{formatBRL(total)}</span>
                {beneficiario.available > total && (
                  <span className="text-xs text-muted-foreground">
                    {formatBRL(beneficiario.available - total)} continuam disponíveis
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Vencimento</Label>
                <Popover>
                  <PopoverTrigger render={<Button variant="outline" className="justify-start font-normal" />}>
                    <CalendarIcon />
                    {formatDate(dueDate)}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => date && setDueDate(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={confirmar} disabled={pending || total <= 0}>
            Confirmar repasse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RepasseConcluidoDialog({
  repasse,
  onClose,
}: {
  repasse: { beneficiario: BeneficiaryPosition; amount: number } | null
  onClose: () => void
}) {
  return (
    <Dialog open={repasse !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {repasse && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-positive/15 text-positive">
                <CheckIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Repasse gerado com sucesso!</p>
                <p className="text-xs text-muted-foreground">
                  Ele entrou em contas a pagar. Pague o favorecido e concilie a saída no extrato da conta.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Favorecido</span>
                <span className="font-medium">{repasse.beneficiario.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor do repasse</span>
                <span className="font-medium">{formatBRL(repasse.amount)}</span>
              </div>
            </div>

            {!repasse.beneficiario.bankDetails && (
              <div className="space-y-1 border-t pt-3">
                <p className="text-sm font-semibold">Dados bancários</p>
                <p className="text-xs text-muted-foreground">
                  Este favorecido foi cadastrado sem dados bancários — complete o cadastro dele em Contatos para que a
                  chave PIX e a conta apareçam aqui.
                </p>
              </div>
            )}

            {repasse.beneficiario.bankDetails && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-semibold">Dados bancários</p>
                <div className="grid grid-cols-2 gap-2">
                  <CampoCopiavel label="Chave PIX" value={repasse.beneficiario.bankDetails.pixKey} />
                  <CampoCopiavel label="Tipo de conta" value={repasse.beneficiario.bankDetails.accountType} />
                  <CampoCopiavel label="Banco" value={repasse.beneficiario.bankDetails.bank} className="col-span-2" />
                  <CampoCopiavel label="Agência" value={repasse.beneficiario.bankDetails.branchNumber} />
                  <CampoCopiavel label="Conta" value={repasse.beneficiario.bankDetails.accountNumber} />
                  <CampoCopiavel
                    label="Titular"
                    value={repasse.beneficiario.bankDetails.accountHolder}
                    className="col-span-2"
                  />
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter className="sm:justify-center">
          <DialogClose render={<Button variant="outline" size="sm" />}>Fechar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const extratoColunas = "grid-cols-[72px_1fr_auto_auto] sm:grid-cols-[84px_1fr_88px_120px_120px]"

function ExtratoSheet({
  statement,
  loading,
  open,
  onOpenChange,
  onOpenEntry,
}: {
  statement: BeneficiaryStatement | null
  loading: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenEntry: (entryId: string) => void
}) {
  const toOrg = useOrgPath()
  const today = React.useMemo(() => new Date(), [])
  const [period, setPeriod] = React.useState<PeriodRange>(() => getPeriodRange("all", today))

  const slice = React.useMemo(
    () => (statement ? sliceStatement(statement.lines, period) : null),
    [statement, period],
  )

  const pdfHref = statement
    ? toOrg(
        `/reports/beneficiary-statement/pdf?${new URLSearchParams({
          beneficiaryId: statement.beneficiaryId,
          ...(period.from ? { from: toParamDate(period.from) } : {}),
          ...(period.to ? { to: toParamDate(period.to) } : {}),
        }).toString()}`,
      )
    : undefined

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Prefixo data-[side=right] para vencer o sm:max-w-sm padrão do SheetContent. */}
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Extrato - {statement?.name ?? ""}</SheetTitle>
        </SheetHeader>

        {loading || !statement || !slice ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="grid grid-cols-3 gap-2 border-b p-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="font-semibold">{formatBRL(statement.available)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="font-semibold">{formatBRL(statement.pending)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Realizado</p>
                <p className="font-semibold">{formatBRL(statement.realized)}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-3 border-b p-4">
              <PeriodFilter
                value={period}
                onChange={setPeriod}
                today={today}
                label="Período"
              />
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={pdfHref} target="_blank" rel="noopener noreferrer" />}
              >
                <FileDownIcon />
                Exportar PDF
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-b bg-muted/30 px-4 py-3 text-xs sm:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Saldo anterior</p>
                <p className="text-sm font-medium">{formatBRL(slice.openingBalance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recebimentos</p>
                <p className="text-sm font-medium text-positive">{formatBRL(slice.credits)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Repasses</p>
                <p className="text-sm font-medium text-negative">
                  {slice.debits > 0 ? "- " : ""}
                  {formatBRL(slice.debits)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo final</p>
                <p className="text-sm font-semibold">{formatBRL(slice.closingBalance)}</p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Mesmas colunas do PDF; no celular o vencimento desce para baixo da descrição. */}
              <div
                className={`sticky top-0 z-10 grid ${extratoColunas} gap-3 border-b bg-popover px-4 py-2 text-xs font-medium text-muted-foreground`}
              >
                <div>Data</div>
                <div>Descrição</div>
                <div className="hidden sm:block">Vencimento</div>
                <div className="text-right">Valor</div>
                <div className="text-right">Saldo</div>
              </div>
              <div className="divide-y border-b">
                {slice.lines.length > 0 && (
                  // Saldo de partida abre a lista, como a primeira linha do PDF.
                  <div className={`grid ${extratoColunas} gap-3 px-4 py-3 text-sm text-muted-foreground`}>
                    <div className="tabular-nums">{period.from ? formatDate(period.from) : ""}</div>
                    <div>Saldo anterior</div>
                    <div className="hidden sm:block" />
                    <div />
                    <div className="text-right font-semibold tabular-nums text-foreground">
                      {formatBRL(slice.openingBalance)}
                    </div>
                  </div>
                )}
                {slice.lines.map((line) => (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => onOpenEntry(line.entryId)}
                    className={`grid w-full ${extratoColunas} items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50`}
                  >
                    <div className="tabular-nums">{formatDate(line.date)}</div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate font-medium" title={line.title}>{line.title}</p>
                        {line.installmentLabel && (
                          <Badge variant="outline" className="shrink-0 font-normal">{line.installmentLabel}</Badge>
                        )}
                        {line.status && (
                          <Badge variant={line.status === "REALIZED" ? "secondary" : "outline"} className="shrink-0">
                            {line.status === "REALIZED" ? "Realizado" : "Pendente"}
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground" title={line.description}>
                        {line.description}
                      </p>
                      <p className="text-xs text-muted-foreground sm:hidden">Vencimento {formatDate(line.dueDate)}</p>
                    </div>
                    <div className="hidden tabular-nums text-muted-foreground sm:block">{formatDate(line.dueDate)}</div>
                    <div
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        line.amount >= 0 ? "text-positive" : "text-negative",
                      )}
                    >
                      {line.amount >= 0 ? "" : "- "}
                      {formatBRL(Math.abs(line.amount))}
                    </div>
                    <div className="text-right tabular-nums">{formatBRL(line.balance)}</div>
                  </button>
                ))}
              </div>
              {slice.lines.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  {statement.lines.length === 0
                    ? "Nenhum movimento ainda — o saldo aparece aqui quando um recebimento com repasse for conciliado."
                    : "Nenhum movimento neste período."}
                </p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export function PayoutView({
  summary,
  initialFilter = "todos",
}: {
  summary: PayoutSummary
  /** Vem de `?saldo=` — o ponto de atenção da Visão geral abre direto em "Com saldo". */
  initialFilter?: FiltroSaldo
}) {
  const router = useRouter()
  const [filtroSaldo, setFiltroSaldo] = React.useState<FiltroSaldo>(initialFilter)
  const [busca, setBusca] = React.useState("")
  const [extratoAberto, setExtratoAberto] = React.useState(false)
  const [statement, setStatement] = React.useState<BeneficiaryStatement | null>(null)
  const [statementLoading, setStatementLoading] = React.useState(false)
  const [detailEntry, setDetailEntry] = React.useState<AccountEntry | null>(null)
  const [gerando, setGerando] = React.useState<BeneficiaryPosition | null>(null)
  const [concluido, setConcluido] = React.useState<{ beneficiario: BeneficiaryPosition; amount: number } | null>(null)

  const visiveis = React.useMemo(() => {
    return summary.beneficiaries.filter((beneficiario) => {
      const combinaSaldo =
        filtroSaldo === "todos" ||
        (filtroSaldo === "com-saldo" && beneficiario.available > 0) ||
        (filtroSaldo === "sem-saldo" && beneficiario.available === 0)
      return combinaSaldo && beneficiario.name.toLowerCase().includes(busca.toLowerCase())
    })
  }, [summary.beneficiaries, filtroSaldo, busca])

  function abrirExtrato(beneficiario: BeneficiaryPosition) {
    setStatement(null)
    setStatementLoading(true)
    setExtratoAberto(true)
    getBeneficiaryStatementAction(beneficiario.beneficiaryId).then((response) => {
      if (response.ok) setStatement(response.data)
      setStatementLoading(false)
    })
  }

  function recarregarExtrato(beneficiaryId: string) {
    getBeneficiaryStatementAction(beneficiaryId).then((response) => {
      if (response.ok) setStatement(response.data)
    })
  }

  function abrirLancamento(entryId: string) {
    getAccountEntryAction(entryId).then((response) => {
      if (response.ok) setDetailEntry(response.data)
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponível</p>
            <p className="text-2xl font-semibold">{formatBRL(summary.totals.available)}</p>
            <p className="text-xs text-muted-foreground">Saldo para novos repasses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Pendente</p>
            <p className="text-2xl font-semibold">{formatBRL(summary.totals.pending)}</p>
            <p className="text-xs text-muted-foreground">Repasses gerados aguardando conciliação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Realizado</p>
            <p className="text-2xl font-semibold">{formatBRL(summary.totals.realized)}</p>
            <p className="text-xs text-muted-foreground">Repasses já conciliados</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <ToggleGroup
          variant="outline"
          multiple={false}
          value={[filtroSaldo]}
          onValueChange={(value) => value[0] && setFiltroSaldo(value[0] as FiltroSaldo)}
        >
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
          <ToggleGroupItem value="com-saldo">Com saldo</ToggleGroupItem>
          <ToggleGroupItem value="sem-saldo">Sem saldo</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Favorecido</span>
          <Input
            placeholder="Buscar favorecido"
            className="w-64"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <div className={`grid ${colunas} gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground`}>
          <div>Favorecido</div>
          <div className="text-right">Disponível</div>
          <div className="text-right">Pendente</div>
          <div className="text-right">Realizado</div>
          <div />
        </div>
        <div className="divide-y">
          {visiveis.map((beneficiario) => (
            <div key={beneficiario.beneficiaryId} className={`grid ${colunas} items-center gap-4 px-4 py-3`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{beneficiario.name}</p>
                <p className="truncate text-xs text-muted-foreground">{beneficiario.document ?? "—"}</p>
              </div>
              <div className="text-right text-sm font-medium">{formatBRL(beneficiario.available)}</div>
              <div className="text-right text-sm text-muted-foreground">
                {beneficiario.pending > 0 ? formatBRL(beneficiario.pending) : "—"}
              </div>
              <div className="text-right text-sm font-medium">{formatBRL(beneficiario.realized)}</div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => abrirExtrato(beneficiario)}>
                  Extrato
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={beneficiario.available <= 0}
                  onClick={() => setGerando(beneficiario)}
                >
                  Gerar repasse
                </Button>
              </div>
            </div>
          ))}
          {visiveis.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum favorecido encontrado para os filtros selecionados.
            </p>
          )}
        </div>
      </div>

      <ExtratoSheet
        statement={statement}
        loading={statementLoading}
        open={extratoAberto}
        onOpenChange={setExtratoAberto}
        onOpenEntry={abrirLancamento}
      />

      <EntryDetailSheet
        entry={detailEntry}
        kind={detailEntry?.kind ?? "rec"}
        open={detailEntry !== null}
        onOpenChange={(next) => {
          if (next) return
          setDetailEntry(null)
          // O lançamento pode ter sido excluído ou estornado — o extrato ao lado precisa refletir isso.
          if (statement) recarregarExtrato(statement.beneficiaryId)
        }}
      />

      <GerarRepasseDialog
        key={gerando?.beneficiaryId ?? "nenhum"}
        beneficiario={gerando}
        onClose={() => setGerando(null)}
        onDone={(repasse) => {
          setGerando(null)
          setConcluido(repasse)
          router.refresh()
        }}
      />

      <RepasseConcluidoDialog repasse={concluido} onClose={() => setConcluido(null)} />
    </div>
  )
}
