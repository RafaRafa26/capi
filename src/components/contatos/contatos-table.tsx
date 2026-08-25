"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { type Contato, type PapelContato, papelLabel } from "@/modules/contatos/tipos";

const papelParamToPapel: Record<string, PapelContato> = {
  favorecido: "FAVORECIDO",
  fornecedor: "FORNECEDOR",
  pagador: "PAGADOR",
};

export function ContatosTable({ contatos }: { contatos: Contato[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const papelParam = searchParams.get("papel");

  const [query, setQuery] = useState("");
  const [papel, setPapel] = useState<PapelContato | "todos">(
    papelParam ? (papelParamToPapel[papelParam] ?? "todos") : "todos",
  );
  const [situacao, setSituacao] = useState<"todos" | "ATIVO" | "INATIVO">("todos");

  const filtered = useMemo(() => {
    return contatos.filter((contato) => {
      const matchesQuery = contato.nome.toLowerCase().includes(query.toLowerCase());
      const matchesPapel = papel === "todos" || contato.papeis.includes(papel);
      const matchesSituacao =
        situacao === "todos" || contato.ativo === (situacao === "ATIVO");
      return matchesQuery && matchesPapel && matchesSituacao;
    });
  }, [contatos, query, papel, situacao]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-[380px]">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            className="pl-9"
          />
        </div>

        <Select value={papel} onValueChange={(value) => setPapel(value as typeof papel)}>
          <SelectTrigger className="w-auto gap-2">
            <span className="text-muted-foreground">Papel:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="PAGADOR">Pagador</SelectItem>
            <SelectItem value="FAVORECIDO">Favorecido</SelectItem>
            <SelectItem value="FORNECEDOR">Fornecedor</SelectItem>
          </SelectContent>
        </Select>

        <Select value={situacao} onValueChange={(value) => setSituacao(value as typeof situacao)}>
          <SelectTrigger className="w-auto gap-2">
            <span className="text-muted-foreground">Situação:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ATIVO">Ativos</SelectItem>
            <SelectItem value="INATIVO">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button asChild>
          <Link href="/contatos/novo">
            <Plus />
            Novo contato
          </Link>
        </Button>
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Nome</TableHead>
              <TableHead className="w-[180px]">Papéis</TableHead>
              <TableHead className="w-[120px]">Situação</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((contato) => (
              <TableRow
                key={contato.id}
                className="cursor-pointer"
                onClick={() => router.push(`/contatos/${contato.id}`)}
              >
                <TableCell className="font-semibold">{contato.nome}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {contato.papeis.map((papelItem) => (
                      <Badge key={papelItem} variant="secondary" className="rounded-full text-[10px] font-medium">
                        {papelLabel[papelItem]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full text-[11px] font-semibold",
                      contato.ativo
                        ? "bg-[#ecfdf5] text-[#218358]"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {contato.ativo ? "Ativo" : "Inativo"}
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
                        <Link href={`/contatos/${contato.id}`}>Ver detalhes</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/contatos/${contato.id}/editar`}>Editar</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  Nenhum contato encontrado.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between p-4">
          <p className="text-muted-foreground text-sm">
            Mostrando 1-{filtered.length} de {filtered.length} contatos
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
