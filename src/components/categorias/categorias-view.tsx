"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Plus } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Categoria, TipoCategoria } from "@/lib/mock-data/categorias";

function NovaCategoriaDialog({ onCreate }: { onCreate: (nome: string, tipo: TipoCategoria) => void }) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoria>("RECEITA");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim()) return;
    onCreate(nome.trim(), tipo);
    toast.success("Categoria criada.");
    setNome("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-nome">Nome</Label>
            <Input
              id="categoria-nome"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex: Receita com vendas"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="categoria-tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(value) => setTipo(value as TipoCategoria)}>
              <SelectTrigger id="categoria-tipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEITA">Receita</SelectItem>
                <SelectItem value="DESPESA">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit">Salvar categoria</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoriaRow({ categoria }: { categoria: Categoria }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-border border-b last:border-b-0">
      <div className="flex h-[52px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="bg-[#22c55e] h-5 w-1 rounded-full" />
          <GripVertical className="text-muted-foreground size-[18px]" />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-muted-foreground"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <p className="text-sm font-semibold">{categoria.nome}</p>
          <Badge variant="secondary" className="rounded-full text-xs font-normal">
            {categoria.subcategorias.length} subcategorias
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Adicionar subcategoria</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {expanded
        ? categoria.subcategorias.map((sub) => (
            <div
              key={sub.id}
              className="border-border flex h-[52px] items-center justify-between border-t pr-4 pl-[48px]"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="text-muted-foreground size-[18px]" />
                <p className="text-sm">{sub.nome}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Editar</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        : null}
    </div>
  );
}

export function CategoriasView({ categorias }: { categorias: Categoria[] }) {
  const [list, setList] = useState(categorias);
  const [tab, setTab] = useState<"todas" | TipoCategoria>("todas");

  const filtered = useMemo(
    () => (tab === "todas" ? list : list.filter((categoria) => categoria.tipo === tab)),
    [list, tab],
  );

  function handleCreate(nome: string, tipo: TipoCategoria) {
    setList((current) => [
      ...current,
      { id: `${Date.now()}`, nome, tipo, subcategorias: [] },
    ]);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="RECEITA">Receitas</TabsTrigger>
            <TabsTrigger value="DESPESA">Despesas</TabsTrigger>
          </TabsList>
        </Tabs>
        <NovaCategoriaDialog onCreate={handleCreate} />
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        {filtered.map((categoria) => (
          <CategoriaRow key={categoria.id} categoria={categoria} />
        ))}
        {filtered.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">Nenhuma categoria.</p>
        ) : null}
      </div>
    </div>
  );
}
