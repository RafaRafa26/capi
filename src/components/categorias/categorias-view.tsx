"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import {
  criarCategoriaAction,
  excluirCategoriaAction,
  renomearCategoriaAction,
} from "@/app/(app)/categorias/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { CategoriaArvore, TipoCategoria } from "@/modules/categorias/servico";

function NovaCategoriaDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<TipoCategoria>("RECEITA");
  const [salvando, iniciar] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    iniciar(async () => {
      const r = await criarCategoriaAction({ nome, tipo });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Categoria criada.");
      setNome("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova categoria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="nova-categoria-nome">Nome</Label>
              <Input
                id="nova-categoria-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Receita com vendas"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nova-categoria-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCategoria)}>
                <SelectTrigger id="nova-categoria-tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar categoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Renomear serve tanto para categoria quanto para subcategoria. */
function RenomearDialog({
  id,
  nomeAtual,
  aberto,
  onOpenChange,
}: {
  id: string;
  nomeAtual: string;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeAtual);
  const [salvando, iniciar] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    iniciar(async () => {
      const r = await renomearCategoriaAction(id, nome);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Categoria renomeada.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Renomear</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={`renomear-${id}`}>Nome</Label>
            <Input
              id={`renomear-${id}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NovaSubcategoriaDialog({
  paiId,
  tipo,
  aberto,
  onOpenChange,
}: {
  paiId: string;
  tipo: TipoCategoria;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [salvando, iniciar] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    iniciar(async () => {
      const r = await criarCategoriaAction({ nome, tipo, paiId });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Subcategoria criada.");
      setNome("");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova subcategoria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor={`sub-${paiId}`}>Nome</Label>
            <Input
              id={`sub-${paiId}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Venda de gado"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar subcategoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirDialog({
  id,
  nome,
  aberto,
  onOpenChange,
}: {
  id: string;
  nome: string;
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const [excluindo, iniciar] = useTransition();

  function confirmar() {
    iniciar(async () => {
      const r = await excluirCategoriaAction(id);
      if (!r.ok) {
        toast.error(r.erro);
        onOpenChange(false);
        return;
      }
      toast.success("Categoria excluída.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={aberto} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{nome}”?</AlertDialogTitle>
          <AlertDialogDescription>
            As subcategorias dela também são excluídas. Categorias que já
            classificam lançamentos não podem ser excluídas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              confirmar();
            }}
            disabled={excluindo}
          >
            {excluindo ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CategoriaRow({ categoria }: { categoria: CategoriaArvore }) {
  const [expanded, setExpanded] = useState(true);
  const [renomeando, setRenomeando] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [subEmFoco, setSubEmFoco] = useState<{ id: string; nome: string } | null>(null);
  const [acaoSub, setAcaoSub] = useState<"renomear" | "excluir" | null>(null);

  return (
    <div className="border-border border-b last:border-b-0" data-testid="categoria">
      <div className="flex h-[52px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span
            className={
              categoria.tipo === "RECEITA"
                ? "h-5 w-1 rounded-full bg-[#22c55e]"
                : "h-5 w-1 rounded-full bg-[#e5484d]"
            }
          />
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="text-muted-foreground"
            aria-label={expanded ? "Recolher" : "Expandir"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <p className="text-sm font-semibold">{categoria.nome}</p>
          <Badge variant="secondary" className="rounded-full text-xs font-normal">
            {categoria.subcategorias.length}{" "}
            {categoria.subcategorias.length === 1 ? "subcategoria" : "subcategorias"}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              data-testid="categoria-menu"
              aria-label={`Ações de ${categoria.nome}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenomeando(true)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setAdicionando(true)}>
              Adicionar subcategoria
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setExcluindo(true)}>
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded
        ? categoria.subcategorias.map((sub) => (
            <div
              key={sub.id}
              className="border-border flex h-[52px] items-center justify-between border-t pr-4 pl-[48px]"
            >
              <p className="text-sm">{sub.nome}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onSelect={() => {
                      setSubEmFoco(sub);
                      setAcaoSub("renomear");
                    }}
                  >
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => {
                      setSubEmFoco(sub);
                      setAcaoSub("excluir");
                    }}
                  >
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        : null}

      {renomeando ? (
        <RenomearDialog
          id={categoria.id}
          nomeAtual={categoria.nome}
          aberto={renomeando}
          onOpenChange={setRenomeando}
        />
      ) : null}
      {adicionando ? (
        <NovaSubcategoriaDialog
          paiId={categoria.id}
          tipo={categoria.tipo}
          aberto={adicionando}
          onOpenChange={setAdicionando}
        />
      ) : null}
      {excluindo ? (
        <ExcluirDialog
          id={categoria.id}
          nome={categoria.nome}
          aberto={excluindo}
          onOpenChange={setExcluindo}
        />
      ) : null}

      {subEmFoco && acaoSub === "renomear" ? (
        <RenomearDialog
          id={subEmFoco.id}
          nomeAtual={subEmFoco.nome}
          aberto
          onOpenChange={() => setAcaoSub(null)}
        />
      ) : null}
      {subEmFoco && acaoSub === "excluir" ? (
        <ExcluirDialog
          id={subEmFoco.id}
          nome={subEmFoco.nome}
          aberto
          onOpenChange={() => setAcaoSub(null)}
        />
      ) : null}
    </div>
  );
}

export function CategoriasView({ categorias }: { categorias: CategoriaArvore[] }) {
  const [tab, setTab] = useState<"todas" | TipoCategoria>("todas");

  const filtradas = useMemo(
    () => (tab === "todas" ? categorias : categorias.filter((c) => c.tipo === tab)),
    [categorias, tab],
  );

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
        <NovaCategoriaDialog />
      </div>

      <div className="bg-card border-border w-full overflow-hidden rounded-[10px] border shadow-sm">
        {filtradas.map((categoria) => (
          <CategoriaRow key={categoria.id} categoria={categoria} />
        ))}
        {filtradas.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm">Nenhuma categoria.</p>
        ) : null}
      </div>
    </div>
  );
}
