"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import type { ItemConciliacao } from "@/lib/mock-data/conciliacao";
import { contasBancarias } from "@/lib/mock-data/contas-bancarias";
import { contatos } from "@/lib/mock-data/contatos";
import { categorias } from "@/lib/mock-data/categorias";

const contasProprias = contasBancarias.filter((c) => c.natureza === "PROPRIA" && c.ativa);

function formatDateBR(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function OfxSide({ item }: { item: ItemConciliacao }) {
  const isEntrada = item.ofx.tipo === "ENTRADA";
  return (
    <div className="flex flex-1 items-start gap-3 p-4">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isEntrada ? "bg-[#ecfdf5] text-[#0d9488]" : "bg-[#fff5f5] text-[#e5484d]",
        )}
      >
        {isEntrada ? <ArrowUpRight className="size-[18px]" /> : <ArrowDownLeft className="size-[18px]" />}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{item.ofx.descricao}</p>
          <button
            type="button"
            aria-label="Ignorar transação"
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
        <p className="text-muted-foreground text-xs">
          {formatDateBR(item.ofx.data)} <span className="px-1">|</span> {isEntrada ? "Entrada" : "Saída"}
        </p>
        <p className={cn("text-base font-semibold", isEntrada ? "text-[#0d9488]" : "text-[#e5484d]")}>
          {formatMoney(item.ofx.valor)}
        </p>
      </div>
    </div>
  );
}

function MatchedSide({ match }: { match: NonNullable<ItemConciliacao["match"]> }) {
  return (
    <div className="flex flex-1 flex-col gap-1 p-4">
      <p className="text-sm font-medium">{match.descricao}</p>
      <p className="text-muted-foreground text-xs">
        {match.contato} <span className="px-1">|</span> {formatDateBR(match.data)}{" "}
        <span className="px-1">|</span> {match.categoria}
      </p>
      <p className="text-base font-semibold">{formatMoney(match.valor)}</p>
    </div>
  );
}

function CreateLancamentoSide({ item }: { item: ItemConciliacao }) {
  const [tipo, setTipo] = useState(item.criarTipoSugerido ?? "PAGAMENTO");
  const isTransferencia = tipo === "TRANSFERENCIA";
  const favorecidosOuFornecedores = contatos.filter(
    (c) => c.papeis.includes("FAVORECIDO") || c.papeis.includes("FORNECEDOR"),
  );
  const categoriasDespesa = categorias.filter((c) => c.tipo === "DESPESA");

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <Select value={tipo} onValueChange={(value) => setTipo(value as typeof tipo)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PAGAMENTO">Pagamento</SelectItem>
            <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
          </SelectContent>
        </Select>
        {!isTransferencia ? (
          <Button type="button" variant="outline" size="sm">
            <Search />
            Buscar lançamento
          </Button>
        ) : null}
      </div>

      {isTransferencia ? (
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Conta de destino" />
          </SelectTrigger>
          <SelectContent>
            {contasProprias.map((conta) => (
              <SelectItem key={conta.id} value={conta.id}>
                {conta.nome} — {conta.banco}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex gap-3">
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Contato" />
            </SelectTrigger>
            <SelectContent>
              {favorecidosOuFornecedores.map((contato) => (
                <SelectItem key={contato.id} value={contato.id}>
                  {contato.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {categoriasDespesa.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.id}>
                  {categoria.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Input
        placeholder={
          isTransferencia
            ? "Transferência entre contas próprias"
            : "Descrição"
        }
      />
    </div>
  );
}

function ConciliacaoRow({
  item,
  onApprove,
}: {
  item: ItemConciliacao;
  onApprove: (id: string) => void;
}) {
  return (
    <div className="flex items-stretch">
      <div className="flex flex-1">
        <OfxSide item={item} />
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-1">
        {item.match ? <MatchedSide match={item.match} /> : <CreateLancamentoSide item={item} />}
      </div>
      <div className="flex shrink-0 items-center gap-1 p-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Conciliar"
          className="size-9 text-[#0d9488] hover:bg-[#ecfdf5] hover:text-[#0d9488]"
          onClick={() => onApprove(item.id)}
        >
          <Check className="size-[18px]" />
        </Button>
        {item.match ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Buscar outro lançamento"
            className="size-9"
            onClick={() => toast("Buscar outro lançamento correspondente.")}
          >
            <ArrowRightLeft className="size-[18px]" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ConciliacaoView({ itens }: { itens: ItemConciliacao[] }) {
  const [tab, setTab] = useState<"todas" | "entradas" | "saidas">("todas");
  const [pendentes, setPendentes] = useState(itens);

  const filtrados = useMemo(() => {
    if (tab === "entradas") return pendentes.filter((item) => item.ofx.tipo === "ENTRADA");
    if (tab === "saidas") return pendentes.filter((item) => item.ofx.tipo === "SAIDA");
    return pendentes;
  }, [pendentes, tab]);

  function handleApprove(id: string) {
    setPendentes((current) => current.filter((item) => item.id !== id));
    toast.success("Lançamento conciliado.");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Conciliação</h1>
        <div className="flex items-center gap-3">
          <div className="bg-card border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <span className="text-muted-foreground">Conta:</span>
            <span className="font-medium">ASAAS - Ag 1234 / CC 56789</span>
            <ChevronDown className="text-muted-foreground size-3.5" />
          </div>
          <Button variant="outline">Importar OFX</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="todas">Todas ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="saidas">Saídas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-3">
          <div className="bg-card border-border flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            01/08/2026 — 17/08/2026
          </div>
          <div className="relative w-[228px]">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input placeholder="Buscar..." className="pl-9" />
          </div>
        </div>
      </div>

      <Separator />

      <div className="text-muted-foreground -mt-2 flex text-xs font-medium">
        <div className="flex flex-1 items-center gap-2">
          <Building2 className="size-[18px]" />
          Extrato bancário
        </div>
        <div className="flex flex-1 items-center gap-2">
          <Receipt className="size-[18px]" />
          Lançamento no Capi
        </div>
      </div>

      <Separator />

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="bg-muted flex size-20 items-center justify-center rounded-full">
            <CheckCircle2 className="text-muted-foreground size-10" />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-lg font-semibold">Nenhuma transação pendente</p>
            <p className="text-muted-foreground max-w-[420px] text-sm">
              Todas as transações do período foram conciliadas. Importe um novo extrato OFX
              para continuar.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card border-border w-full divide-y overflow-hidden rounded-[10px] border shadow-sm">
          {filtrados.map((item) => (
            <ConciliacaoRow key={item.id} item={item} onApprove={handleApprove} />
          ))}
        </div>
      )}
    </div>
  );
}
