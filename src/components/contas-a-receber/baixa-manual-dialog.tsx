"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { darBaixaManualAction } from "@/app/(app)/conciliacao/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import type { LancamentoDaLista } from "@/modules/lancamentos/tipos";

const SEM_CONTA = "__sem_conta__";

/**
 * Baixa manual (RN-20): quita parcelas pagas direto ao favorecido.
 *
 * Só oferece contas de TERCEIRO: dinheiro que cai em conta própria precisa
 * liquidar por conciliação de extrato, senão a mesma entrada geraria crédito
 * duas vezes quando aparecesse no OFX (RN-21).
 */
export function BaixaManualDialog({
  selecionados,
  contasDeTerceiro,
  aberto,
  onOpenChange,
  onConcluido,
}: {
  selecionados: LancamentoDaLista[];
  contasDeTerceiro: { id: string; nome: string }[];
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  onConcluido: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [contaId, setContaId] = useState<string>(SEM_CONTA);
  const [observacao, setObservacao] = useState("");
  const [salvando, iniciar] = useTransition();

  const emAberto = selecionados.map((l) => ({
    ...l,
    restante: l.valorPrevisto - l.valorLiquidado,
  }));
  const total = emAberto.reduce((soma, l) => soma + l.restante, 0);

  function confirmar() {
    if (!data) {
      toast.error("Informe a data da baixa.");
      return;
    }

    const linhas = emAberto
      .filter((l) => l.restante > 0)
      .map((l) => ({ lancamentoId: l.id, valor: l.restante }));

    if (linhas.length === 0) {
      toast.error("As parcelas selecionadas já estão liquidadas.");
      return;
    }

    iniciar(async () => {
      const r = await darBaixaManualAction(
        linhas,
        data,
        contaId === SEM_CONTA ? null : contaId,
        observacao || undefined,
      );
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        linhas.length === 1
          ? "Parcela baixada."
          : `${linhas.length} parcelas baixadas.`,
      );
      onOpenChange(false);
      onConcluido();
      router.refresh();
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dar baixa manual</DialogTitle>
          <DialogDescription>
            Para parcelas pagas diretamente ao favorecido. A parcela é quitada,
            mas o saldo de custódia não muda — esse dinheiro não passou pela
            organização.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="border-border max-h-[160px] overflow-y-auto rounded-md border">
            {emAberto.map((l) => (
              <div
                key={l.id}
                className="border-border flex items-center justify-between border-b px-3 py-2 text-sm last:border-b-0"
              >
                <span className="truncate">{l.descricao}</span>
                <span className="font-medium">{formatMoney(l.restante)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">{formatMoney(total)}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baixa-data">Data da baixa</Label>
            <Input
              id="baixa-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baixa-conta">Conta de terceiro (opcional)</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger id="baixa-conta" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CONTA}>
                  Não informar (pagamento em espécie)
                </SelectItem>
                {contasDeTerceiro.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baixa-obs">Observação</Label>
            <Textarea
              id="baixa-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: pago em espécie na fazenda"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={confirmar} disabled={salvando}>
            <CheckCheck className="size-4" />
            {salvando ? "Baixando..." : "Confirmar baixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
