"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatBRL, formatDate, formatMonthYear } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  beneficiarios,
  resumoRepasses,
  type Beneficiario,
} from "@/lib/mock/payout"

type FiltroSaldo = "todos" | "com-saldo" | "sem-saldo"

const colunas = "grid-cols-[1fr_160px_160px_160px_200px]"

function GerarRepasseDialog({
  beneficiario,
  open,
  onOpenChange,
  onConfirm,
}: {
  beneficiario: Beneficiario | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (beneficiario: Beneficiario) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerar Repasse</DialogTitle>
        </DialogHeader>

        {beneficiario && (
          <>
            <p className="text-sm text-muted-foreground">
              {beneficiario.nome} — {beneficiario.documento}
            </p>

            <ScrollArea className="h-72 pr-4">
              <div className="divide-y">
                {beneficiario.itensDisponiveis.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.cliente}</p>
                      <p className="truncate text-muted-foreground">
                        Contrato {item.contrato} · Vencimento{" "}
                        {formatDate(item.vencimento)}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium">
                      {formatBRL(item.valor)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm text-muted-foreground">
                Total do repasse
              </span>
              <span className="text-lg font-semibold">
                {formatBRL(beneficiario.disponivel)}
              </span>
            </div>
          </>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button onClick={() => beneficiario && onConfirm(beneficiario)}>
            Confirmar repasse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CampoCopiavel({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  const [copiado, setCopiado] = React.useState(false)

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
          {copiado ? (
            <CheckIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}

function RepasseConcluidoDialog({
  beneficiario,
  open,
  onOpenChange,
}: {
  beneficiario: Beneficiario | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        {beneficiario && (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckIcon className="size-5" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">
                  Repasse gerado com sucesso!
                </p>
                <p className="text-xs text-muted-foreground">
                  Copie os dados bancários do beneficiário e realize o repasse
                </p>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Beneficiário</span>
                <span className="font-medium">{beneficiario.nome}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Valor do repasse</span>
                <span className="font-medium">
                  {formatBRL(beneficiario.disponivel)}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <p className="text-sm font-semibold">Dados bancários</p>
              <div className="grid grid-cols-2 gap-2">
                <CampoCopiavel
                  label="Chave PIX"
                  value={beneficiario.dadosBancarios.chavePix}
                />
                <CampoCopiavel
                  label="Tipo de conta"
                  value={beneficiario.dadosBancarios.tipoConta}
                />
                <CampoCopiavel
                  label="Banco"
                  value={beneficiario.dadosBancarios.banco}
                  className="col-span-2"
                />
                <CampoCopiavel
                  label="Agência"
                  value={beneficiario.dadosBancarios.agencia}
                />
                <CampoCopiavel
                  label="Conta"
                  value={beneficiario.dadosBancarios.conta}
                />
                <CampoCopiavel
                  label="Titular"
                  value={beneficiario.dadosBancarios.titular}
                  className="col-span-2"
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-center">
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Fechar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PayoutView() {
  const [filtroSaldo, setFiltroSaldo] = React.useState<FiltroSaldo>("todos")
  const [mesReferencia, setMesReferencia] = React.useState<Date>(
    new Date(2026, 7, 1)
  )
  const [busca, setBusca] = React.useState("")
  const [beneficiarioSelecionado, setBeneficiarioSelecionado] =
    React.useState<Beneficiario | null>(null)
  const [repasseConcluido, setRepasseConcluido] =
    React.useState<Beneficiario | null>(null)

  const visiveis = React.useMemo(() => {
    return beneficiarios.filter((b) => {
      const combinaSaldo =
        filtroSaldo === "todos" ||
        (filtroSaldo === "com-saldo" && b.disponivel > 0) ||
        (filtroSaldo === "sem-saldo" && b.disponivel === 0)
      const combinaBusca = b.nome.toLowerCase().includes(busca.toLowerCase())
      return combinaSaldo && combinaBusca
    })
  }, [filtroSaldo, busca])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Disponível</p>
            <p className="text-2xl font-semibold">
              {formatBRL(resumoRepasses.disponivel)}
            </p>
            <p className="text-xs text-muted-foreground">
              Saldo para novos repasses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Pendente</p>
            <p className="text-2xl font-semibold">
              {formatBRL(resumoRepasses.pendente)}
            </p>
            <p className="text-xs text-muted-foreground">
              Repasses gerados aguardando conciliação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Realizado</p>
            <p className="text-2xl font-semibold">
              {formatBRL(resumoRepasses.realizado)}
            </p>
            <p className="text-xs text-muted-foreground">
              Repasses realizados no período
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <ToggleGroup
          variant="outline"
          multiple={false}
          value={[filtroSaldo]}
          onValueChange={(value) =>
            value[0] && setFiltroSaldo(value[0] as FiltroSaldo)
          }
        >
          <ToggleGroupItem value="todos">Todos</ToggleGroupItem>
          <ToggleGroupItem value="com-saldo">Com saldo</ToggleGroupItem>
          <ToggleGroupItem value="sem-saldo">Sem saldo</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Data</span>
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="font-normal" />
              }
            >
              <CalendarIcon />
              {formatMonthYear(mesReferencia)}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                defaultMonth={mesReferencia}
                selected={mesReferencia}
                onSelect={(date) => date && setMesReferencia(date)}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Beneficiário</span>
          <Input
            placeholder="Buscar beneficiário"
            className="w-64"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        <Button variant="outline" size="sm">
          Filtrar
        </Button>
      </div>

      <div className="rounded-lg border">
        <div
          className={`grid ${colunas} gap-4 border-b px-4 py-3 text-sm font-medium text-muted-foreground`}
        >
          <div>Beneficiário</div>
          <div className="text-right">Disponível</div>
          <div className="text-right">Pendente</div>
          <div className="text-right">Realizado</div>
          <div />
        </div>
        <div className="divide-y">
          {visiveis.map((b) => (
            <div
              key={b.id}
              className={`grid ${colunas} items-center gap-4 px-4 py-3`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{b.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.documento}
                </p>
              </div>
              <div className="text-right text-sm font-medium">
                {formatBRL(b.disponivel)}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {b.pendente > 0 ? formatBRL(b.pendente) : "—"}
              </div>
              <div className="text-right text-sm font-medium">
                {formatBRL(b.realizado)}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm">
                  Extrato
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={b.disponivel === 0}
                  onClick={() => setBeneficiarioSelecionado(b)}
                >
                  Gerar repasse
                </Button>
              </div>
            </div>
          ))}
          {visiveis.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum beneficiário encontrado para os filtros selecionados.
            </p>
          )}
        </div>
      </div>

      <GerarRepasseDialog
        beneficiario={beneficiarioSelecionado}
        open={beneficiarioSelecionado !== null}
        onOpenChange={(open) => !open && setBeneficiarioSelecionado(null)}
        onConfirm={(beneficiario) => {
          setBeneficiarioSelecionado(null)
          setRepasseConcluido(beneficiario)
        }}
      />

      <RepasseConcluidoDialog
        beneficiario={repasseConcluido}
        open={repasseConcluido !== null}
        onOpenChange={(open) => !open && setRepasseConcluido(null)}
      />
    </div>
  )
}
