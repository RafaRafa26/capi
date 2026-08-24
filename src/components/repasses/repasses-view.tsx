"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { formatMoney } from "@/lib/format";
import type { FavorecidoRepasse } from "@/lib/mock-data/repasses";
import { GerarRepasseDialog } from "@/components/repasses/gerar-repasse-dialog";

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="bg-card border-border flex-1 rounded-xl border p-5">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-2xl font-bold">{formatMoney(value)}</p>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    </div>
  );
}

export function RepassesView({ favorecidos }: { favorecidos: FavorecidoRepasse[] }) {
  const [tab, setTab] = useState<"todos" | "com_saldo" | "sem_saldo">("todos");
  const [busca, setBusca] = useState("");

  const totalDisponivel = favorecidos.reduce((sum, f) => sum + f.disponivel, 0);
  const totalPendente = favorecidos.reduce((sum, f) => sum + f.pendente, 0);
  const totalRealizado = favorecidos.reduce((sum, f) => sum + f.realizado, 0);

  const filtrados = useMemo(() => {
    let list = favorecidos;
    if (tab === "com_saldo") list = list.filter((f) => f.disponivel > 0);
    if (tab === "sem_saldo") list = list.filter((f) => f.disponivel === 0);
    if (busca) list = list.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase()));
    return list;
  }, [favorecidos, tab, busca]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Repasses</h1>

      <div className="flex gap-6">
        <SummaryCard
          label="Disponível"
          value={totalDisponivel}
          description="Saldo para novos repasses"
        />
        <SummaryCard
          label="Pendente"
          value={totalPendente}
          description="Repasses gerados aguardando conciliação"
        />
        <SummaryCard
          label="Realizado"
          value={totalRealizado}
          description="Repasses realizados no período"
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="com_saldo">Com saldo</TabsTrigger>
            <TabsTrigger value="sem_saldo">Sem saldo</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">Data</span>
            <div className="bg-card border-border flex items-center gap-2 rounded-md border px-3 py-2">
              <CalendarDays className="size-4" />
              <span className="text-sm font-medium">Agosto de 2026</span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">Favorecido</span>
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar favorecido..."
              className="w-[260px]"
            />
          </div>
          <Button variant="outline" onClick={() => toast("Filtros aplicados.")}>
            Filtrar
          </Button>
        </div>
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Favorecido</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
              <TableHead className="text-right">Pendente</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((favorecido) => (
              <TableRow key={favorecido.id}>
                <TableCell>
                  <p className="font-semibold">{favorecido.nome}</p>
                  <p className="text-muted-foreground text-xs">{favorecido.documento}</p>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoney(favorecido.disponivel)}
                </TableCell>
                <TableCell className="text-right">
                  {favorecido.pendente ? formatMoney(favorecido.pendente) : "—"}
                </TableCell>
                <TableCell className="text-right">{formatMoney(favorecido.realizado)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast("Extrato do favorecido em breve.")}
                    >
                      Extrato
                    </Button>
                    <GerarRepasseDialog favorecido={favorecido} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Nenhum favorecido encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
