"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, CheckIcon, CopyIcon } from "lucide-react"

import { EntryDetailSheet } from "@/components/accounts/entry-detail-sheet"
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
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatBRL, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AccountEntry } from "@/modules/accounts/types"
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
  const [credits, setCredits] = React.useState<BeneficiaryCredit[]>([])
  const [dueDate, setDueDate] = React.useState<Date>(() => new Date())
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const beneficiarioId = beneficiario?.beneficiaryId
  const disponivel = beneficiario?.available ?? 0

  React.useEffect(() => {
    if (!beneficiarioId) return
    let ignore = false
    listAvailableCreditsAction(beneficiarioId).then((response) => {
      if (ignore) return
      if (response.ok) setCredits(response.data)
    })
    return () => {
      ignore = true
    }
  }, [beneficiarioId])

  async function confirmar() {
    if (!beneficiario) return
    setPending(true)
    setError(null)
    const response = await generatePayoutAction({ beneficiaryId: beneficiario.beneficiaryId, dueDate })
    setPending(false)
    if (!response.ok) {
      setError(response.error)
      return
    }
    onDone({ beneficiario, amount: disponivel })
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

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Recebimentos que compõem o saldo disponível</span>
              <ScrollArea className="h-56 pr-4">
                <div className="divide-y">
                  {credits.map((credit) => (
                    <div key={credit.settlementId} className="flex min-w-0 items-center justify-between gap-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{credit.payerName}</p>
                        <p className="truncate text-muted-foreground">
                          {credit.description} · Recebido em {formatDate(credit.settledAt)}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium">{formatBRL(credit.amount)}</span>
                    </div>
                  ))}
                  {credits.length === 0 && (
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
                <span className="text-2xl font-semibold">{formatBRL(disponivel)}</span>
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
          <Button onClick={confirmar} disabled={pending || disponivel <= 0}>
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
              <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="border-b p-4">
          <SheetTitle>Extrato — {statement?.name ?? ""}</SheetTitle>
        </SheetHeader>

        {loading || !statement ? (
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

            <div className="min-h-0 flex-1 divide-y overflow-y-auto">
              {statement.lines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => onOpenEntry(line.entryId)}
                  className="flex w-full min-w-0 items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{line.title}</p>
                      {line.status && (
                        <Badge variant={line.status === "REALIZED" ? "secondary" : "outline"}>
                          {line.status === "REALIZED" ? "Realizado" : "Pendente"}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {line.description} · {formatDate(line.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      line.amount >= 0 ? "text-emerald-500" : "text-red-500",
                    )}
                  >
                    {line.amount >= 0 ? "" : "- "}
                    {formatBRL(Math.abs(line.amount))}
                  </span>
                </button>
              ))}
              {statement.lines.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum movimento ainda — o saldo aparece aqui quando um recebimento com repasse for conciliado.
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
        onOpenChange={(next) => !next && setDetailEntry(null)}
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
