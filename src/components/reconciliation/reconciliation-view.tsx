"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import {
  ArrowDownLeftIcon,
  ArrowLeftRightIcon,
  ArrowUpRightIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  LandmarkIcon,
  FileTextIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatBRL, formatDate } from "@/lib/format"
import {
  categoriasDespesa,
  contaConciliacao,
  contasDestinoDisponiveis,
  contatosDisponiveis,
  transacoesBancarias,
  type TipoCategorizacao,
  type TransacaoBancaria,
} from "@/lib/mock/reconciliation"
import { cn } from "@/lib/utils"

type FiltroTipo = "todas" | "entrada" | "saida"
type Ordenacao = "data" | "valor-desc" | "valor-asc"

const primeiraData = transacoesBancarias.reduce(
  (min, t) => (t.data < min ? t.data : min),
  transacoesBancarias[0].data
)
const ultimaData = transacoesBancarias.reduce(
  (max, t) => (t.data > max ? t.data : max),
  transacoesBancarias[0].data
)

function CategorizacaoForm({
  tipo,
  onTipoChange,
}: {
  tipo: TipoCategorizacao
  onTipoChange: (tipo: TipoCategorizacao) => void
}) {
  return (
    <div className="w-full space-y-2">
      <Select
        value={tipo}
        onValueChange={(value) => value && onTipoChange(value as TipoCategorizacao)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pagamento">Pagamento</SelectItem>
          <SelectItem value="transferencia">Transferência</SelectItem>
        </SelectContent>
      </Select>

      {tipo === "pagamento" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Select defaultValue={contatosDisponiveis[0]}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Contato" />
              </SelectTrigger>
              <SelectContent>
                {contatosDisponiveis.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue={categoriasDespesa[0]}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDespesa.map((categoria) => (
                  <SelectItem key={categoria} value={categoria}>
                    {categoria}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Descrição" className="flex-1" />
            <Button variant="outline" size="icon">
              <SearchIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <Select defaultValue={contasDestinoDisponiveis[0]}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Conta de destino" />
            </SelectTrigger>
            <SelectContent>
              {contasDestinoDisponiveis.map((conta) => (
                <SelectItem key={conta} value={conta}>
                  {conta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Descrição" />
        </>
      )}
    </div>
  )
}

function ReconciliationRow({
  transacao,
  confirmado,
  onConfirm,
  onRemove,
  tipoCategorizacao,
  onTipoCategorizacaoChange,
}: {
  transacao: TransacaoBancaria
  confirmado: boolean
  onConfirm: () => void
  onRemove: () => void
  tipoCategorizacao: TipoCategorizacao
  onTipoCategorizacaoChange: (tipo: TipoCategorizacao) => void
}) {
  const isEntrada = transacao.tipo === "entrada"

  return (
    <div
      className={cn(
        "flex items-stretch gap-3 transition-opacity",
        confirmado && "opacity-60"
      )}
    >
      <div className="flex flex-1 flex-col justify-between gap-3 rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              isEntrada
                ? "bg-emerald-500/15 text-emerald-500"
                : "bg-red-500/15 text-red-500"
            )}
          >
            {isEntrada ? (
              <ArrowDownLeftIcon className="size-4" />
            ) : (
              <ArrowUpRightIcon className="size-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">{transacao.descricao}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(transacao.data)} · {isEntrada ? "Entrada" : "Saída"}
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                isEntrada ? "text-emerald-500" : "text-red-500"
              )}
            >
              {isEntrada ? "" : "- "}
              {formatBRL(transacao.valor)}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 rounded-lg border p-4">
        <div className="min-w-0">
          {transacao.match ? (
            <div className="space-y-0.5">
              <p className="truncate text-sm font-medium">
                {transacao.match.descricao}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {transacao.match.origem} · {formatDate(transacao.match.data)} ·{" "}
                {transacao.match.categoria}
              </p>
              <p className="text-sm font-semibold">
                {formatBRL(transacao.match.valor)}
              </p>
            </div>
          ) : (
            <CategorizacaoForm
              tipo={tipoCategorizacao}
              onTipoChange={onTipoCategorizacaoChange}
            />
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className={cn(
              "flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70",
              !transacao.match && "invisible"
            )}
          >
            <ArrowLeftRightIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center self-center">
        <button
          type="button"
          onClick={onConfirm}
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-colors",
            confirmado
              ? "bg-emerald-500 text-white"
              : "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
          )}
        >
          <CheckIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

export function ReconciliationView() {
  const [transacoes, setTransacoes] = React.useState(transacoesBancarias)
  const [filtroTipo, setFiltroTipo] = React.useState<FiltroTipo>("todas")
  const [busca, setBusca] = React.useState("")
  const [ordenacao, setOrdenacao] = React.useState<Ordenacao>("data")
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: primeiraData,
    to: ultimaData,
  })
  const [confirmados, setConfirmados] = React.useState<Set<string>>(new Set())
  const [categorizacoes, setCategorizacoes] = React.useState<
    Record<string, TipoCategorizacao>
  >(() =>
    Object.fromEntries(
      transacoesBancarias
        .filter((t) => t.categorizacaoSugerida)
        .map((t) => [t.id, t.categorizacaoSugerida as TipoCategorizacao])
    )
  )

  const filtradasPorDataEBusca = React.useMemo(() => {
    return transacoes.filter((t) => {
      const noPeriodo =
        !dateRange?.from ||
        (t.data >= dateRange.from && t.data <= (dateRange.to ?? dateRange.from))
      const combinaBusca = t.descricao
        .toLowerCase()
        .includes(busca.toLowerCase())
      return noPeriodo && combinaBusca
    })
  }, [transacoes, dateRange, busca])

  const contagens = {
    todas: filtradasPorDataEBusca.length,
    entrada: filtradasPorDataEBusca.filter((t) => t.tipo === "entrada").length,
    saida: filtradasPorDataEBusca.filter((t) => t.tipo === "saida").length,
  }

  const visiveis = React.useMemo(() => {
    const porTipo = filtradasPorDataEBusca.filter(
      (t) => filtroTipo === "todas" || t.tipo === filtroTipo
    )
    return [...porTipo].sort((a, b) => {
      if (ordenacao === "valor-desc") return b.valor - a.valor
      if (ordenacao === "valor-asc") return a.valor - b.valor
      return a.data.getTime() - b.data.getTime()
    })
  }, [filtradasPorDataEBusca, filtroTipo, ordenacao])

  function toggleConfirmado(id: string) {
    setConfirmados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function removerTransacao(id: string) {
    setTransacoes((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Conta:</span>
            <Select defaultValue={contaConciliacao}>
              <SelectTrigger className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={contaConciliacao}>{contaConciliacao}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm">
            <UploadIcon />
            Importar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup
          variant="outline"
          multiple={false}
          value={[filtroTipo]}
          onValueChange={(value) => value[0] && setFiltroTipo(value[0] as FiltroTipo)}
        >
          <ToggleGroupItem value="todas">Todas ({contagens.todas})</ToggleGroupItem>
          <ToggleGroupItem value="entrada">
            Entradas ({contagens.entrada})
          </ToggleGroupItem>
          <ToggleGroupItem value="saida">Saídas ({contagens.saida})</ToggleGroupItem>
        </ToggleGroup>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="outline" size="sm" className="font-normal" />
              }
            >
              <CalendarIcon />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {formatDate(dateRange.from)} – {formatDate(dateRange.to)}
                  </>
                ) : (
                  formatDate(dateRange.from)
                )
              ) : (
                <span>Selecionar período</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                showOutsideDays={false}
              />
            </PopoverContent>
          </Popover>

          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="w-56 pl-8"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="sm" className="font-normal" />
              }
            >
              Valor
              <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={ordenacao}
                onValueChange={(value) => setOrdenacao(value as Ordenacao)}
              >
                <DropdownMenuRadioItem value="data">Data</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="valor-desc">
                  Maior valor
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="valor-asc">
                  Menor valor
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
        <div className="flex flex-1 items-center gap-2">
          <LandmarkIcon className="size-4" />
          Lançamentos do Banco
        </div>
        <div className="flex flex-1 items-center gap-2">
          <FileTextIcon className="size-4" />
          Lançamentos do Capi
        </div>
        <div className="w-7 shrink-0" />
      </div>

      <div className="space-y-3">
        {visiveis.map((transacao) => (
          <ReconciliationRow
            key={transacao.id}
            transacao={transacao}
            confirmado={confirmados.has(transacao.id)}
            onConfirm={() => toggleConfirmado(transacao.id)}
            onRemove={() => removerTransacao(transacao.id)}
            tipoCategorizacao={categorizacoes[transacao.id] ?? "pagamento"}
            onTipoCategorizacaoChange={(tipo) =>
              setCategorizacoes((prev) => ({ ...prev, [transacao.id]: tipo }))
            }
          />
        ))}
        {visiveis.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhum lançamento encontrado para os filtros selecionados.
          </p>
        )}
      </div>
    </div>
  )
}
