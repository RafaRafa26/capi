import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContaSelector } from "@/components/contas-bancarias/conta-selector";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { contasBancarias, getContaBancariaById } from "@/lib/mock-data/contas-bancarias";
import { extratoContaPrincipal } from "@/lib/mock-data/extrato";

export default async function ExtratoContaBancariaPage({
  params,
}: PageProps<"/contas-bancarias/[id]/extrato">) {
  const { id } = await params;
  const conta = getContaBancariaById(id);

  if (!conta) {
    notFound();
  }

  const lancamentos = extratoContaPrincipal;
  const saldoInicial = lancamentos[0]?.saldo ?? 0;
  const saldoFinal = lancamentos[lancamentos.length - 1]?.saldo ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-sm">
          <Link href="/contas-bancarias" className="text-muted-foreground hover:underline">
            Contas bancárias
          </Link>
          <ChevronRight className="text-muted-foreground size-3" />
          <span className="font-medium">{conta.nome}</span>
        </div>
        <h1 className="text-2xl font-bold">Extrato</h1>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ContaSelector contas={contasBancarias} contaId={conta.id} />
        <div className="bg-card border-border flex items-center gap-2 rounded-md border px-3 py-2">
          <CalendarDays className="size-4" />
          <span className="text-sm font-medium">01/08/2026 — 17/08/2026</span>
        </div>
        <div className="flex-1" />
        <Button variant="outline">
          <Download />
          Exportar CSV
        </Button>
      </div>

      <div className="flex gap-6">
        <div className="bg-card border-border flex-1 rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm">Saldo inicial (01/08)</p>
          <p className="text-3xl font-bold">{formatMoney(saldoInicial)}</p>
        </div>
        <div className="bg-card border-border flex-1 rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm">Saldo final (17/08)</p>
          <p className="text-3xl font-bold">{formatMoney(saldoFinal)}</p>
        </div>
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lancamentos.map((lancamento) => (
              <TableRow key={`${lancamento.data}-${lancamento.descricao}`}>
                <TableCell>{lancamento.data}</TableCell>
                <TableCell className="font-medium">{lancamento.descricao}</TableCell>
                <TableCell className="text-muted-foreground">
                  {lancamento.categoria ?? "—"}
                </TableCell>
                <TableCell className="text-right text-[#0d9488]">
                  {lancamento.entrada ? formatMoney(lancamento.entrada) : "—"}
                </TableCell>
                <TableCell className="text-right text-[#e5484d]">
                  {lancamento.saida ? formatMoney(lancamento.saida) : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(lancamento.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4">
          <p className="text-muted-foreground text-sm">
            Mostrando 1-{lancamentos.length} de {lancamentos.length} lançamentos
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
