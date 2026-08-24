"use client";

import { useState } from "react";
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
import { contasBancarias } from "@/lib/mock-data/contas-bancarias";
import type { FavorecidoRepasse } from "@/lib/mock-data/repasses";

const contasProprias = contasBancarias.filter((c) => c.natureza === "PROPRIA" && c.ativa);

function toCents(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function GerarRepasseDialog({ favorecido }: { favorecido: FavorecidoRepasse }) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState((favorecido.disponivel / 100).toFixed(2).replace(".", ","));
  const [contaId, setContaId] = useState("");

  const valorCents = toCents(valor);
  const excedeSaldo = valorCents > favorecido.disponivel;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (excedeSaldo || valorCents <= 0) return;
    toast.success(`Repasse de ${formatMoney(valorCents)} gerado para ${favorecido.nome}.`);
    setOpen(false);
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
            <Button type="submit" disabled={excedeSaldo || valorCents <= 0}>
              Confirmar repasse
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
