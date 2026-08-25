"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, MoreHorizontal, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import {
  type LancamentoDaLista,
  situacaoClasses,
  situacaoLabel,
} from "@/modules/lancamentos/tipos";
import { BaixaManualDialog } from "@/components/contas-a-receber/baixa-manual-dialog";

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

function SummaryCard({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  return (
    <div className="bg-card border-border flex-1 rounded-xl border p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm">{label}</p>
        <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
          {count} lançamento{count === 1 ? "" : "s"}
        </Badge>
      </div>
      <p className="mt-2 text-2xl font-bold">{formatMoney(total)}</p>
    </div>
  );
}

export function ContasAReceberView({
  lancamentos,
  contasDeTerceiro,
}: {
  lancamentos: LancamentoDaLista[];
  contasDeTerceiro: { id: string; nome: string }[];
}) {
  const [tab, setTab] = useState<"todas" | "a_vencer" | "vencidas" | "recebidas">("todas");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [baixaAberta, setBaixaAberta] = useState(false);

  // Só faz sentido dar baixa no que ainda não está liquidado.
  const selecionadosEmAberto = lancamentos.filter(
    (l) => selected.has(l.id) && l.situacao !== "LIQUIDADO",
  );

  const vencidos = lancamentos.filter((l) => l.situacao === "VENCIDO");
  const venceHoje = lancamentos.filter((l) => l.situacao === "VENCE_HOJE");
  const aVencer = lancamentos.filter((l) => l.situacao === "A_VENCER");
  const recebidos = lancamentos.filter((l) => l.situacao === "LIQUIDADO");

  const filtered = useMemo(() => {
    let list = lancamentos;
    if (tab === "a_vencer") list = [...venceHoje, ...aVencer];
    if (tab === "vencidas") list = vencidos;
    if (tab === "recebidas") list = recebidos;
    if (query) {
      list = list.filter(
        (l) =>
          l.contato.toLowerCase().includes(query.toLowerCase()) ||
          l.descricao.toLowerCase().includes(query.toLowerCase()),
      );
    }
    return list;
  }, [lancamentos, tab, query, venceHoje, aVencer, vencidos, recebidos]);

  function toggleRow(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas a receber</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download />
            Exportar CSV
          </Button>
          <Button asChild>
            <Link href="/contas-a-receber/novo">
              <Plus />
              Novo recebimento
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <SummaryCard
          label="Vencido"
          count={vencidos.length}
          total={vencidos.reduce((sum, l) => sum + l.valorPrevisto, 0)}
        />
        <SummaryCard
          label="Vence hoje"
          count={venceHoje.length}
          total={venceHoje.reduce((sum, l) => sum + l.valorPrevisto, 0)}
        />
        <SummaryCard
          label="A vencer"
          count={aVencer.length}
          total={aVencer.reduce((sum, l) => sum + l.valorPrevisto, 0)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="todas">Todas ({lancamentos.length})</TabsTrigger>
            <TabsTrigger value="a_vencer">
              A vencer ({venceHoje.length + aVencer.length})
            </TabsTrigger>
            <TabsTrigger value="vencidas">Vencidas ({vencidos.length})</TabsTrigger>
            <TabsTrigger value="recebidas">Recebidas ({recebidos.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full max-w-[260px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar..."
            className="pl-9"
          />
        </div>
      </div>

      {selecionadosEmAberto.length > 0 ? (
        <div className="bg-muted/60 border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
          <p className="text-sm">
            {selecionadosEmAberto.length}{" "}
            {selecionadosEmAberto.length === 1
              ? "parcela selecionada"
              : "parcelas selecionadas"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
              Limpar seleção
            </Button>
            <Button size="sm" onClick={() => setBaixaAberta(true)}>
              Dar baixa manual
            </Button>
          </div>
        </div>
      ) : null}

      <BaixaManualDialog
        selecionados={selecionadosEmAberto}
        contasDeTerceiro={contasDeTerceiro}
        aberto={baixaAberta}
        onOpenChange={setBaixaAberta}
        onConcluido={() => setSelected(new Set())}
      />

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-10" />
              <TableHead>Vencimento</TableHead>
              <TableHead>Recebido de</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor previsto</TableHead>
              <TableHead className="text-right">Valor recebido</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((lancamento) => (
              <TableRow key={lancamento.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(lancamento.id)}
                    onCheckedChange={() => toggleRow(lancamento.id)}
                  />
                </TableCell>
                <TableCell>{formatDate(lancamento.vencimento)}</TableCell>
                <TableCell className="font-medium">{lancamento.contato}</TableCell>
                <TableCell className="text-muted-foreground max-w-[220px] truncate">
                  {lancamento.descricao}
                </TableCell>
                <TableCell>{lancamento.categoria}</TableCell>
                <TableCell className="text-right">{formatMoney(lancamento.valorPrevisto)}</TableCell>
                <TableCell className="text-right">
                  {lancamento.valorLiquidado > 0 ? formatMoney(lancamento.valorLiquidado) : "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full text-[11px] font-semibold",
                      situacaoClasses[lancamento.situacao],
                    )}
                  >
                    {situacaoLabel[lancamento.situacao]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-6">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Conciliar</DropdownMenuItem>
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">Cancelar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4">
          <p className="text-muted-foreground text-sm">
            Mostrando 1-{filtered.length} de {filtered.length} lançamentos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
