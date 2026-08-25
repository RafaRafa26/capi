"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import { gerarRepasseAction } from "@/app/(app)/repasses/actions";
import { paraCentavos } from "@/shared/dinheiro";
import type { PosicaoFavorecido } from "@/modules/custodia/tipos";

function toCents(value: string) {
  try {
    return paraCentavos(value);
  } catch {
    return 0;
  }
}

export function GerarRepasseDialog({
  favorecido,
  contasProprias,
  categoriaRepasseId,
}: {
  favorecido: PosicaoFavorecido;
  contasProprias: { id: string; nome: string; banco: string }[];
  categoriaRepasseId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState((favorecido.disponivel / 100).toFixed(2).replace(".", ","));
  const [contaId, setContaId] = useState("");
  const [vencimento, setVencimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [gerando, iniciar] = useTransition();

  const valorCents = toCents(valor);
  const excedeSaldo = valorCents > favorecido.disponivel;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (excedeSaldo || valorCents <= 0) return;

    if (!categoriaRepasseId) {
      toast.error("Cadastre uma categoria de despesa para classificar o repasse.");
      return;
    }

    iniciar(async () => {
      const r = await gerarRepasseAction({
        favorecidoId: favorecido.favorecidoId,
        valor: valorCents,
        vencimento,
        categoriaId: categoriaRepasseId,
      });

      if (!r.ok) {
        toast.error(r.erro);
        return;
      }

      // Fica PENDENTE (RN-11): o saldo já está reservado, mas o débito de
      // custódia só nasce quando a saída for conciliada no extrato.
      toast.success(
        `Repasse de ${formatMoney(valorCents)} gerado para ${favorecido.nome}. ` +
          "Concilie a saída no extrato para concluí-lo.",
      );
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={favorecido.disponivel <= 0}>
          Gerar repasse
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Gerar repasse — {favorecido.nome}</DialogTitle>
            <DialogDescription>
              Saldo disponível: {formatMoney(favorecido.disponivel)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="repasse-valor">Valor do repasse</Label>
            <Input
              id="repasse-valor"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              placeholder="R$ 0,00"
              aria-invalid={excedeSaldo}
              className={excedeSaldo ? "border-destructive" : undefined}
            />
            {excedeSaldo ? (
              <p className="text-destructive text-sm">
                O valor não pode exceder o saldo disponível ({formatMoney(favorecido.disponivel)}).
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="repasse-vencimento">Data prevista</Label>
            <Input
              id="repasse-vencimento"
              type="date"
              value={vencimento}
              onChange={(event) => setVencimento(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="repasse-conta">Conta de pagamento</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger id="repasse-conta" className="w-full">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contasProprias.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.nome} — {conta.banco}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={gerando || excedeSaldo || valorCents <= 0}>
              {gerando ? "Gerando..." : "Confirmar repasse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
