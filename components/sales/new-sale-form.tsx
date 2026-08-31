"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, HelpCircleIcon, PaperclipIcon } from "lucide-react"
import { ptBR } from "date-fns/locale"

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatBRL, formatDate } from "@/lib/format"
import { contaBancaria } from "@/lib/mock/dashboard"
import {
  beneficiariosDisponiveis,
  categoriasVenda,
  clientes,
  formasPagamento,
} from "@/lib/mock/vendas"

type Aba = "avulsa" | "contrato"
type CobrancaTipo = "parcelada" | "recorrente"
type Periodicidade = "semanal" | "quinzenal" | "mensal" | "anual"
type RepasseModo = "percentual" | "fixo"

interface Beneficiario {
  id: string
  nome: string
  percentual: number
  valorFixo: number
}

function parseBRLInput(value: string): number {
  const limpo = value.replace(/[^\d,]/g, "").replace(",", ".")
  const numero = parseFloat(limpo)
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0
}

function formatBRLInput(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function adicionarPeriodo(
  data: Date,
  periodicidade: Periodicidade,
  vezes: number
): Date {
  const resultado = new Date(data)
  switch (periodicidade) {
    case "semanal":
      resultado.setDate(resultado.getDate() + vezes * 7)
      break
    case "quinzenal":
      resultado.setDate(resultado.getDate() + vezes * 15)
      break
    case "mensal":
      resultado.setMonth(resultado.getMonth() + vezes)
      break
    case "anual":
      resultado.setFullYear(resultado.getFullYear() + vezes)
      break
  }
  return resultado
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={value}
        onValueChange={(newValue) => newValue && onValueChange(newValue)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function LabeledDatePicker({
  label,
  date,
  onSelect,
}: {
  label: string
  date: Date
  onSelect: (date: Date) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" className="w-full justify-start font-normal" />
          }
        >
          <CalendarIcon />
          {formatDate(date)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(value) => value && onSelect(value)}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function LabeledCurrencyInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onChange(formatBRLInput(parseBRLInput(value)))}
      />
    </div>
  )
}

function RepasseSection({
  habilitarRepasse,
  onHabilitarRepasseChange,
  repasseModo,
  onRepasseModoChange,
  beneficiarios,
  onAddBeneficiario,
  onRemoveBeneficiario,
  onUpdateBeneficiario,
  calcularValorRepasse,
}: {
  habilitarRepasse: boolean
  onHabilitarRepasseChange: (value: boolean) => void
  repasseModo: RepasseModo
  onRepasseModoChange: (modo: RepasseModo) => void
  beneficiarios: Beneficiario[]
  onAddBeneficiario: () => void
  onRemoveBeneficiario: (id: string) => void
  onUpdateBeneficiario: (id: string, patch: Partial<Beneficiario>) => void
  calcularValorRepasse: (beneficiario: Beneficiario) => number
}) {
  return (
    <>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            checked={habilitarRepasse}
            onCheckedChange={onHabilitarRepasseChange}
          />
          <Label className="font-medium">Habilitar repasse</Label>
        </div>
        {habilitarRepasse && (
          <ToggleGroup
            variant="outline"
            multiple={false}
            value={[repasseModo]}
            onValueChange={(value) =>
              value[0] && onRepasseModoChange(value[0] as RepasseModo)
            }
          >
            <ToggleGroupItem value="percentual">Percentual</ToggleGroupItem>
            <ToggleGroupItem value="fixo">Valor fixo</ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>

      {habilitarRepasse && (
        <div className="space-y-3">
          {beneficiarios.map((beneficiario) => (
            <div key={beneficiario.id} className="flex items-center gap-3">
              <Select
                value={beneficiario.nome}
                onValueChange={(value) =>
                  value && onUpdateBeneficiario(beneficiario.id, { nome: value })
                }
              >
                <SelectTrigger className="w-full flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {beneficiariosDisponiveis.map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {repasseModo === "percentual" ? (
                <Input
                  className="w-20"
                  value={beneficiario.percentual}
                  onChange={(event) =>
                    onUpdateBeneficiario(beneficiario.id, {
                      percentual: Number(event.target.value) || 0,
                    })
                  }
                />
              ) : (
                <Input
                  className="w-28"
                  value={formatBRLInput(beneficiario.valorFixo)}
                  onChange={(event) =>
                    onUpdateBeneficiario(beneficiario.id, {
                      valorFixo: parseBRLInput(event.target.value),
                    })
                  }
                />
              )}
              <span className="w-28 shrink-0 text-right text-sm font-medium">
                {formatBRL(calcularValorRepasse(beneficiario))}
              </span>
              <button
                type="button"
                onClick={() => onRemoveBeneficiario(beneficiario.id)}
                className="shrink-0 text-sm font-medium text-destructive hover:underline"
              >
                Remover
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={onAddBeneficiario}>
            + Adicionar beneficiário
          </Button>
        </div>
      )}
    </>
  )
}

function ResumoRepasse({
  beneficiarios,
  repasseModo,
  totalRepasse,
  calcularValorRepasse,
}: {
  beneficiarios: Beneficiario[]
  repasseModo: RepasseModo
  totalRepasse: number
  calcularValorRepasse: (beneficiario: Beneficiario) => number
}) {
  return (
    <>
      <Separator />
      <div className="space-y-1.5">
        <h4 className="text-sm font-semibold">Repasse</h4>
        {beneficiarios.map((beneficiario) => (
          <div key={beneficiario.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {beneficiario.nome}
              {repasseModo === "percentual" ? ` · ${beneficiario.percentual}%` : ""}
            </span>
            <span className="font-medium">
              {formatBRL(calcularValorRepasse(beneficiario))}
            </span>
          </div>
        ))}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total a repassar</span>
          <span className="font-medium">{formatBRL(totalRepasse)}</span>
        </div>
      </div>
    </>
  )
}

const contaRecebimentoLabel = `${contaBancaria.nome} - Ag ${contaBancaria.agencia} / CC ${contaBancaria.conta}`

export function NewSaleForm() {
  const router = useRouter()

  const [aba, setAba] = React.useState<Aba>("contrato")

  const [cliente, setCliente] = React.useState(clientes[0])
  const [categoria, setCategoria] = React.useState(categoriasVenda[0])
  const [descricao, setDescricao] = React.useState("Contrato 2026-1234")

  const [cobrancaTipo, setCobrancaTipo] = React.useState<CobrancaTipo>("parcelada")
  const [valorTotalInput, setValorTotalInput] = React.useState("60.000,00")
  const [parcelas, setParcelas] = React.useState(12)
  const [periodicidade, setPeriodicidade] = React.useState<Periodicidade>("mensal")
  const [primeiroVencimento, setPrimeiroVencimento] = React.useState(
    new Date(2026, 7, 10)
  )
  const [formaPagamento, setFormaPagamento] = React.useState(formasPagamento[0])
  const [contaRecebimento, setContaRecebimento] = React.useState(
    contaRecebimentoLabel
  )

  const [habilitarRepasse, setHabilitarRepasse] = React.useState(true)
  const [repasseModo, setRepasseModo] = React.useState<RepasseModo>("percentual")
  const [beneficiarios, setBeneficiarios] = React.useState<Beneficiario[]>([
    { id: "1", nome: beneficiariosDisponiveis[0], percentual: 100, valorFixo: 6000000 },
  ])

  const valorTotal = parseBRLInput(valorTotalInput)
  const valorParcela =
    cobrancaTipo === "parcelada" && parcelas > 0
      ? Math.round(valorTotal / parcelas)
      : valorTotal

  const parcelasGeradas = React.useMemo(() => {
    const quantidade = cobrancaTipo === "parcelada" ? parcelas : 3
    return Array.from({ length: Math.max(quantidade, 0) }, (_, index) => ({
      numero: index + 1,
      data: adicionarPeriodo(primeiroVencimento, periodicidade, index),
      valor: valorParcela,
    }))
  }, [cobrancaTipo, parcelas, periodicidade, primeiroVencimento, valorParcela])

  const ultimoVencimento = parcelasGeradas[parcelasGeradas.length - 1]?.data

  function calcularValorRepasse(beneficiario: Beneficiario) {
    return repasseModo === "percentual"
      ? Math.round(valorTotal * (beneficiario.percentual / 100))
      : beneficiario.valorFixo
  }

  const totalRepasse = beneficiarios.reduce(
    (acc, beneficiario) => acc + calcularValorRepasse(beneficiario),
    0
  )

  function addBeneficiario() {
    setBeneficiarios((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: beneficiariosDisponiveis[0],
        percentual: 0,
        valorFixo: 0,
      },
    ])
  }

  function removeBeneficiario(id: string) {
    setBeneficiarios((prev) => prev.filter((beneficiario) => beneficiario.id !== id))
  }

  function updateBeneficiario(id: string, patch: Partial<Beneficiario>) {
    setBeneficiarios((prev) =>
      prev.map((beneficiario) =>
        beneficiario.id === id ? { ...beneficiario, ...patch } : beneficiario
      )
    )
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
          {aba === "avulsa" ? (
            <>
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Dados da venda</h3>
                <LabeledSelect
                  label="Cliente"
                  value={cliente}
                  onValueChange={setCliente}
                  options={clientes}
                />
                <div className="grid grid-cols-2 gap-4">
                  <LabeledSelect
                    label="Categoria"
                    value={categoria}
                    onValueChange={setCategoria}
                    options={categoriasVenda}
                  />
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input
                      value={descricao}
                      onChange={(event) => setDescricao(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">Cobrança</h3>
                <div className="grid grid-cols-2 gap-4">
                  <LabeledCurrencyInput
                    label="Valor"
                    value={valorTotalInput}
                    onChange={setValorTotalInput}
                  />
                  <LabeledDatePicker
                    label="Data de vencimento"
                    date={primeiroVencimento}
                    onSelect={setPrimeiroVencimento}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <LabeledSelect
                    label="Forma de pagamento"
                    value={formaPagamento}
                    onValueChange={setFormaPagamento}
                    options={formasPagamento}
                  />
                  <LabeledSelect
                    label="Conta de recebimento"
                    value={contaRecebimento}
                    onValueChange={setContaRecebimento}
                    options={[contaRecebimentoLabel]}
                  />
                </div>

                <RepasseSection
                  habilitarRepasse={habilitarRepasse}
                  onHabilitarRepasseChange={setHabilitarRepasse}
                  repasseModo={repasseModo}
                  onRepasseModoChange={setRepasseModo}
                  beneficiarios={beneficiarios}
                  onAddBeneficiario={addBeneficiario}
                  onRemoveBeneficiario={removeBeneficiario}
                  onUpdateBeneficiario={updateBeneficiario}
                  calcularValorRepasse={calcularValorRepasse}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Dados do Contrato</h3>
                  <Button variant="outline" size="sm">
                    <PaperclipIcon />
                    Anexar PDF
                  </Button>
                </div>
                <LabeledSelect
                  label="Cliente"
                  value={cliente}
                  onValueChange={setCliente}
                  options={clientes}
                />
                <div className="grid grid-cols-2 gap-4">
                  <LabeledSelect
                    label="Categoria"
                    value={categoria}
                    onValueChange={setCategoria}
                    options={categoriasVenda}
                  />
                  <div className="space-y-1.5">
                    <Label>Descrição</Label>
                    <Input
                      value={descricao}
                      onChange={(event) => setDescricao(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold">Cobrança</h3>
                    <Tooltip>
                      <TooltipTrigger className="text-muted-foreground">
                        <HelpCircleIcon className="size-3.5" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Como o cliente será cobrado por esse contrato.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <ToggleGroup
                    variant="outline"
                    multiple={false}
                    value={[cobrancaTipo]}
                    onValueChange={(value) =>
                      value[0] && setCobrancaTipo(value[0] as CobrancaTipo)
                    }
                  >
                    <ToggleGroupItem value="parcelada">Parcelada</ToggleGroupItem>
                    <ToggleGroupItem value="recorrente">Recorrente</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <LabeledCurrencyInput
                    label="Valor total"
                    value={valorTotalInput}
                    onChange={setValorTotalInput}
                  />
                  {cobrancaTipo === "parcelada" && (
                    <div className="space-y-1.5">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={parcelas}
                        onChange={(event) =>
                          setParcelas(Math.max(1, Number(event.target.value) || 1))
                        }
                      />
                    </div>
                  )}
                  <LabeledSelect
                    label="Periodicidade"
                    value={periodicidade}
                    onValueChange={(value) =>
                      setPeriodicidade(value as Periodicidade)
                    }
                    options={["semanal", "quinzenal", "mensal", "anual"]}
                  />
                  <LabeledDatePicker
                    label="Primeiro vencimento"
                    date={primeiroVencimento}
                    onSelect={setPrimeiroVencimento}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <LabeledSelect
                    label="Forma de pagamento"
                    value={formaPagamento}
                    onValueChange={setFormaPagamento}
                    options={formasPagamento}
                  />
                  <LabeledSelect
                    label="Conta de recebimento"
                    value={contaRecebimento}
                    onValueChange={setContaRecebimento}
                    options={[contaRecebimentoLabel]}
                  />
                </div>

                <RepasseSection
                  habilitarRepasse={habilitarRepasse}
                  onHabilitarRepasseChange={setHabilitarRepasse}
                  repasseModo={repasseModo}
                  onRepasseModoChange={setRepasseModo}
                  beneficiarios={beneficiarios}
                  onAddBeneficiario={addBeneficiario}
                  onRemoveBeneficiario={removeBeneficiario}
                  onUpdateBeneficiario={updateBeneficiario}
                  calcularValorRepasse={calcularValorRepasse}
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Resumo</h3>
          <p className="text-2xl font-semibold">{formatBRL(valorTotal)}</p>

          {aba === "avulsa" ? (
            <>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Forma de pagamento</span>
                  <span className="font-medium">{formaPagamento}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de vencimento</span>
                  <span className="font-medium">
                    {formatDate(primeiroVencimento)}
                  </span>
                </div>
              </div>

              {habilitarRepasse && beneficiarios.length > 0 && (
                <ResumoRepasse
                  beneficiarios={beneficiarios}
                  repasseModo={repasseModo}
                  totalRepasse={totalRepasse}
                  calcularValorRepasse={calcularValorRepasse}
                />
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobrança</span>
                  <span className="font-medium">
                    {cobrancaTipo === "parcelada" ? "Parcelada" : "Recorrente"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {cobrancaTipo === "parcelada"
                      ? `${parcelas} parcelas de`
                      : "Valor por cobrança"}
                  </span>
                  <span className="font-medium">{formatBRL(valorParcela)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primeiro vencimento</span>
                  <span className="font-medium">
                    {formatDate(primeiroVencimento)}
                  </span>
                </div>
                {cobrancaTipo === "parcelada" && ultimoVencimento && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Último vencimento</span>
                    <span className="font-medium">
                      {formatDate(ultimoVencimento)}
                    </span>
                  </div>
                )}
              </div>

              {habilitarRepasse && beneficiarios.length > 0 && (
                <ResumoRepasse
                  beneficiarios={beneficiarios}
                  repasseModo={repasseModo}
                  totalRepasse={totalRepasse}
                  calcularValorRepasse={calcularValorRepasse}
                />
              )}

              <Separator />
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold">Próximas parcelas</h4>
                {parcelasGeradas.slice(0, 3).map((parcela) => (
                  <div key={parcela.numero} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {parcela.numero} · {formatDate(parcela.data)}
                    </span>
                    <span className="font-medium">{formatBRL(parcela.valor)}</span>
                  </div>
                ))}
                {parcelasGeradas.length > 3 && (
                  <a
                    href="#"
                    className="inline-block text-sm font-medium text-primary hover:underline"
                  >
                    Ver todas
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Cancelar
        </Button>
        <Button onClick={() => router.push("/dashboard")}>Salvar</Button>
      </div>
    </div>
  )
}
