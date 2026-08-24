"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { contatos } from "@/lib/mock-data/contatos";
import { categorias } from "@/lib/mock-data/categorias";
import { centrosDeCusto } from "@/lib/mock-data/centros-de-custo";
import { contasBancarias } from "@/lib/mock-data/contas-bancarias";

const clientes = contatos.filter((c) => c.papeis.includes("PAGADOR"));
const favorecidos = contatos.filter((c) => c.papeis.includes("FAVORECIDO"));
const categoriasReceita = categorias
  .filter((categoria) => categoria.tipo === "RECEITA")
  .flatMap((categoria) =>
    categoria.subcategorias.map((sub) => ({
      value: sub.id,
      label: `${categoria.nome} — ${sub.nome}`,
    })),
  );
const contasRecebimento = contasBancarias.filter((c) => c.natureza === "PROPRIA" && c.ativa);
const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência bancária", "Dinheiro", "Cartão"];
const PERIODICIDADES = ["Mensal", "Quinzenal", "Semanal", "Anual"];

type Payee = { id: string; favorecidoId: string; percentual: string };

function addMonths(iso: string, months: number) {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function formatDateBR(iso: string) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function toCents(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold">{children}</p>
      {action}
    </div>
  );
}

function RepasseSection({
  total,
  ativo,
  setAtivo,
  payees,
  setPayees,
}: {
  total: number;
  ativo: boolean;
  setAtivo: (value: boolean) => void;
  payees: Payee[];
  setPayees: (payees: Payee[]) => void;
}) {
  const somaPercentual = payees.reduce((sum, p) => sum + (Number(p.percentual) || 0), 0);

  function updatePayee(id: string, patch: Partial<Payee>) {
    setPayees(payees.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPayee() {
    setPayees([...payees, { id: `${Date.now()}`, favorecidoId: "", percentual: "" }]);
  }

  function removePayee(id: string) {
    setPayees(payees.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={ativo} onCheckedChange={setAtivo} />
          <Label className="font-normal">Definir repasse a favorecidos</Label>
        </div>
      </div>

      {ativo ? (
        <div className="flex flex-col gap-3">
          {payees.map((payee) => (
            <div key={payee.id} className="flex items-center gap-3">
              <Select
                value={payee.favorecidoId}
                onValueChange={(value) => updatePayee(payee.id, { favorecidoId: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o favorecido" />
                </SelectTrigger>
                <SelectContent>
                  {favorecidos.map((favorecido) => (
                    <SelectItem key={favorecido.id} value={favorecido.id}>
                      {favorecido.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-[110px]">
                <Input
                  value={payee.percentual}
                  onChange={(event) => updatePayee(payee.id, { percentual: event.target.value })}
                  placeholder="0"
                  className="pr-6"
                />
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                  %
                </span>
              </div>
              <p className="text-muted-foreground w-[120px] text-right text-sm">
                {formatMoney(Math.round((total * (Number(payee.percentual) || 0)) / 100))}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => removePayee(payee.id)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}

          <button
            type="button"
            onClick={addPayee}
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm"
          >
            <Plus className="size-4" />
            Adicionar favorecido
          </button>

          <p className="text-sm">
            Total:{" "}
            <span className={cn("font-medium", somaPercentual === 100 ? "text-[#0d9488]" : "text-[#e5484d]")}>
              {somaPercentual}% {somaPercentual === 100 ? "✓" : ""}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function NovoRecebimentoForm() {
  const router = useRouter();

  const [origem, setOrigem] = useState<"avulsa" | "contrato">("avulsa");
  const [clienteId, setClienteId] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [centroCustoId, setCentroCustoId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [contaId, setContaId] = useState("");

  const [cobrancaModo, setCobrancaModo] = useState<"parcelado" | "recorrente">("parcelado");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelas, setParcelas] = useState("12");
  const [periodicidade, setPeriodicidade] = useState("Mensal");
  const [primeiroVencimento, setPrimeiroVencimento] = useState("");

  const [repasseAtivo, setRepasseAtivo] = useState(false);
  const [payees, setPayees] = useState<Payee[]>([]);

  const totalCents = origem === "avulsa" ? toCents(valor || "0") : toCents(valorTotal || "0");
  const numParcelas = Math.max(1, Number(parcelas) || 1);
  const valorParcela = origem === "contrato" ? Math.round(totalCents / numParcelas) : totalCents;

  const proximasParcelas = useMemo(() => {
    if (origem !== "contrato" || !primeiroVencimento) return [];
    return Array.from({ length: Math.min(3, numParcelas) }, (_, index) => ({
      numero: index + 1,
      data: addMonths(primeiroVencimento, index),
      valor: valorParcela,
    }));
  }, [origem, primeiroVencimento, numParcelas, valorParcela]);

  const ultimoVencimento =
    origem === "contrato" && primeiroVencimento ? addMonths(primeiroVencimento, numParcelas - 1) : "";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    toast.success("Recebimento criado.");
    router.push("/contas-a-receber");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">Novo recebimento</h1>
          <Tabs value={origem} onValueChange={(value) => setOrigem(value as typeof origem)}>
            <TabsList>
              <TabsTrigger value="avulsa">Avulsa</TabsTrigger>
              <TabsTrigger value="contrato">Contrato (recorrente)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            <div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
              {origem === "avulsa" ? (
                <>
                  <SectionTitle>Dados da venda</SectionTitle>
                  <div className="flex flex-col gap-2">
                    <Label>Cliente</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Categoria</Label>
                      <Select value={categoriaId} onValueChange={setCategoriaId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasReceita.map((categoria) => (
                            <SelectItem key={categoria.value} value={categoria.value}>
                              {categoria.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Centro de custo</Label>
                      <Select value={centroCustoId} onValueChange={setCentroCustoId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {centrosDeCusto.map((centro) => (
                            <SelectItem key={centro.id} value={centro.id}>
                              {centro.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SectionTitle
                    action={
                      <Button type="button" variant="outline" size="sm">
                        <Upload />
                        Anexar contrato
                      </Button>
                    }
                  >
                    Dados do contrato
                  </SectionTitle>
                  <div className="flex flex-col gap-2">
                    <Label>Cliente</Label>
                    <Select value={clienteId} onValueChange={setClienteId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Categoria</Label>
                      <Select value={categoriaId} onValueChange={setCategoriaId}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasReceita.map((categoria) => (
                            <SelectItem key={categoria.value} value={categoria.value}>
                              {categoria.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Descrição</Label>
                      <Input
                        value={descricao}
                        onChange={(event) => setDescricao(event.target.value)}
                        placeholder="Ex: Venda de gado - contrato anual"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
              {origem === "avulsa" ? (
                <>
                  <SectionTitle>Cobrança</SectionTitle>
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Descrição</Label>
                      <Input
                        value={descricao}
                        onChange={(event) => setDescricao(event.target.value)}
                        placeholder="Ex: Venda de gado - Lote 52"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Valor</Label>
                      <Input value={valor} onChange={(event) => setValor(event.target.value)} placeholder="R$ 0,00" />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Vencimento</Label>
                      <Input
                        type="date"
                        value={vencimento}
                        onChange={(event) => setVencimento(event.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <SectionTitle
                    action={
                      <Tabs
                        value={cobrancaModo}
                        onValueChange={(value) => setCobrancaModo(value as typeof cobrancaModo)}
                      >
                        <TabsList>
                          <TabsTrigger value="parcelado">Parcelado</TabsTrigger>
                          <TabsTrigger value="recorrente">Recorrente</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    }
                  >
                    Cobrança
                  </SectionTitle>
                  <div className="flex gap-4">
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Valor total</Label>
                      <Input
                        value={valorTotal}
                        onChange={(event) => setValorTotal(event.target.value)}
                        placeholder="R$ 0,00"
                      />
                    </div>
                    <div className="flex w-[110px] flex-col gap-2">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={parcelas}
                        onChange={(event) => setParcelas(event.target.value)}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Periodicidade</Label>
                      <Select value={periodicidade} onValueChange={setPeriodicidade}>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODICIDADES.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-1 flex-col gap-2">
                      <Label>Primeiro vencimento</Label>
                      <Input
                        type="date"
                        value={primeiroVencimento}
                        onChange={(event) => setPrimeiroVencimento(event.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Forma de pagamento</Label>
                  <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((forma) => (
                        <SelectItem key={forma} value={forma}>
                          {forma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <Label>Conta de recebimento</Label>
                  <Select value={contaId} onValueChange={setContaId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contasRecebimento.map((conta) => (
                        <SelectItem key={conta.id} value={conta.id}>
                          {conta.nome} — {conta.banco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
              <SectionTitle>Repasse</SectionTitle>
              <RepasseSection
                total={totalCents}
                ativo={repasseAtivo}
                setAtivo={setRepasseAtivo}
                payees={payees}
                setPayees={setPayees}
              />
            </div>
          </div>

          <div className="w-full lg:w-[340px]">
            <div className="bg-card border-border sticky top-6 flex flex-col gap-5 rounded-xl border p-6 shadow-sm">
              <p className="text-sm font-semibold">Resumo</p>
              <p className="text-3xl font-bold">{formatMoney(totalCents)}</p>

              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cobrança</span>
                  <span className="font-medium">
                    {origem === "avulsa" ? "Parcela única" : cobrancaModo === "parcelado" ? "Parcelada" : "Recorrente"}
                  </span>
                </div>
                {origem === "avulsa" ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="font-medium">{formatDateBR(vencimento)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{numParcelas} parcelas de</span>
                      <span className="font-medium">{formatMoney(valorParcela)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Primeiro vencimento</span>
                      <span className="font-medium">{formatDateBR(primeiroVencimento)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último vencimento</span>
                      <span className="font-medium">{formatDateBR(ultimoVencimento)}</span>
                    </div>
                  </>
                )}
              </div>

              {repasseAtivo && payees.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold">Repasse</p>
                    {payees.map((payee) => {
                      const favorecido = favorecidos.find((f) => f.id === payee.favorecidoId);
                      const pct = Number(payee.percentual) || 0;
                      return (
                        <div key={payee.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate pr-2">
                            {favorecido?.nome ?? "—"} · {pct}%
                          </span>
                          <span className="font-medium">
                            {formatMoney(Math.round((totalCents * pct) / 100))}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Total a repassar</span>
                      <span className="font-semibold">
                        {formatMoney(
                          payees.reduce(
                            (sum, p) => sum + Math.round((totalCents * (Number(p.percentual) || 0)) / 100),
                            0,
                          ),
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : null}

              {origem === "contrato" && proximasParcelas.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold">Próximas parcelas</p>
                    {proximasParcelas.map((parcela) => (
                      <div key={parcela.numero} className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="size-3.5" />
                          {parcela.numero} · {formatDateBR(parcela.data)}
                        </span>
                        <span className="font-medium">{formatMoney(parcela.valor)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-border sticky bottom-0 flex items-center justify-end gap-2 border-t px-6 py-4 md:px-10">
        <Button type="button" variant="outline" asChild>
          <Link href="/contas-a-receber">Cancelar</Link>
        </Button>
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}
