"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CentroCusto } from "@/lib/mock-data/centros-de-custo";

function NovoCentroCustoDialog({ onCreate }: { onCreate: (nome: string) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim()) return;
    onCreate(nome.trim());
    toast.success("Centro de custo criado.");
    setNome("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Novo centro de custo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Novo centro de custo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="centro-nome">Nome</Label>
            <Input
              id="centro-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex: Fazenda Boa Esperança"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit">Salvar centro de custo</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CentrosDeCustoView({ centros }: { centros: CentroCusto[] }) {
  const [list, setList] = useState(centros);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => list.filter((centro) => centro.nome.toLowerCase().includes(query.toLowerCase())),
    [list, query],
  );

  function handleCreate(nome: string) {
    setList((current) => [...current, { id: `${Date.now()}`, nome, ativo: true }]);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-[380px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome..."
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <NovoCentroCustoDialog onCreate={handleCreate} />
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Nome</TableHead>
              <TableHead className="w-[120px]">Situação</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((centro) => (
              <TableRow key={centro.id}>
                <TableCell className="font-semibold">{centro.nome}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full text-[11px] font-semibold",
                      centro.ativo
                        ? "bg-[#ecfdf5] text-[#218358]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {centro.ativo ? "Ativo" : "Inativo"}
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
                      <DropdownMenuItem>Editar</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive">
                        {centro.ativo ? "Inativar" : "Ativar"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4">
          <p className="text-muted-foreground text-sm">
            Mostrando 1-{filtered.length} de {filtered.length} centros de custo
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
