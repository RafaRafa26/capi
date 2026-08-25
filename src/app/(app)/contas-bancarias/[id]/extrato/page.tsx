import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ContaSelector } from "@/components/contas-bancarias/conta-selector";
import { ImportarOfxDialog } from "@/components/extrato/importar-ofx-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import {
  buscarContaBancaria,
  listarContasBancarias,
} from "@/modules/contas-bancarias/servico";
import { extratoDaConta } from "@/modules/extrato/servico";

const statusBadge: Record<string, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  CONCILIADA: "bg-[#ecfdf5] text-[#218358]",
  IGNORADA: "bg-muted text-muted-foreground line-through",
};

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export default async function ExtratoContaBancariaPage({
  params,
}: PageProps<"/contas-bancarias/[id]/extrato">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();

  const conta = await buscarContaBancaria(sessao.organizacaoId, id);
  if (!conta) notFound();

  const [contas, extrato] = await Promise.all([
    listarContasBancarias(sessao.organizacaoId),
    extratoDaConta(sessao.organizacaoId, id),
  ]);

  const { linhas, saldoInicial, saldoFinal } = extrato;

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
        <ContaSelector contas={contas} contaId={conta.id} />
        <div className="flex-1" />
        {conta.natureza === "PROPRIA" ? (
          <ImportarOfxDialog contaId={conta.id} contaNome={conta.nome} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Conta de terceiro não tem extrato — liquida por baixa manual.
          </p>
        )}
      </div>

      <div className="flex gap-6">
        <div className="bg-card border-border flex-1 rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm">Saldo inicial</p>
          <p className="text-3xl font-bold">{formatMoney(saldoInicial)}</p>
        </div>
        <div className="bg-card border-border flex-1 rounded-xl border p-6 shadow-sm">
          <p className="text-muted-foreground text-sm">Saldo final</p>
          <p className="text-3xl font-bold">{formatMoney(saldoFinal)}</p>
        </div>
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-[90px]">Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[130px]">Situação</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Saída</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha) => (
              <TableRow key={linha.id}>
                <TableCell>{formatarData(linha.data)}</TableCell>
                <TableCell className="font-medium">{linha.descricao}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={`rounded-full text-[11px] font-semibold ${statusBadge[linha.status]}`}
                  >
                    {linha.status === "PENDENTE"
                      ? "A conciliar"
                      : linha.status === "CONCILIADA"
                        ? "Conciliada"
                        : "Ignorada"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-[#0d9488]">
                  {linha.valor > 0 ? formatMoney(linha.valor) : "—"}
                </TableCell>
                <TableCell className="text-right text-[#e5484d]">
                  {linha.valor < 0 ? formatMoney(-linha.valor) : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatMoney(linha.saldo)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {linhas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-muted-foreground text-sm">
              Nenhuma transação nesta conta ainda.
            </p>
            {conta.natureza === "PROPRIA" ? (
              <p className="text-muted-foreground text-sm">
                Importe um arquivo OFX do banco para começar.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-between p-4">
            <p className="text-muted-foreground text-sm">
              Mostrando {linhas.length} {linhas.length === 1 ? "lançamento" : "lançamentos"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/conciliacao">Ir para conciliação</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
