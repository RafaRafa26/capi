"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ContaBancaria } from "@/lib/mock-data/contas-bancarias";

export function ContasBancariasTable({ contas }: { contas: ContaBancaria[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      contas.filter(
        (conta) =>
          conta.nome.toLowerCase().includes(query.toLowerCase()) ||
          conta.banco.toLowerCase().includes(query.toLowerCase()),
      ),
    [contas, query],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-[380px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou banco..."
            className="pl-9"
          />
        </div>
        <div className="flex-1" />
        <Button asChild>
          <Link href="/contas-bancarias/novo">
            <Plus />
            Nova conta
          </Link>
        </Button>
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Nome</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Agência / Conta</TableHead>
              <TableHead>Natureza</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((conta) => (
              <TableRow
                key={conta.id}
                className="cursor-pointer"
                onClick={() => router.push(`/contas-bancarias/${conta.id}/extrato`)}
              >
                <TableCell className="font-semibold">{conta.nome}</TableCell>
                <TableCell>{conta.banco}</TableCell>
                <TableCell>
                  {conta.agencia} / {conta.conta}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-full text-[10px] font-medium">
                    {conta.natureza === "PROPRIA" ? "Própria" : "Terceiro"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full text-[11px] font-semibold",
                      conta.ativa
                        ? "bg-[#ecfdf5] text-[#218358]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {conta.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenuItem asChild>
                        <Link href={`/contas-bancarias/${conta.id}/extrato`}>Ver extrato</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/contas-bancarias/${conta.id}/editar`}>Editar</Link>
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
            Mostrando 1-{filtered.length} de {filtered.length} contas
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
