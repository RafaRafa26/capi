"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, Check, EyeOff, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  conciliarAction,
  ignorarTransacaoAction,
} from "@/app/(app)/conciliacao/actions";
import { ImportarOfxDialog } from "@/components/extrato/importar-ofx-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/format";
import { paraCentavos } from "@/shared/dinheiro";

export type TransacaoPendente = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  contaId: string;
  contaNome: string;
};

export type Candidato = {
  id: string;
  tipo: "RECEBIMENTO" | "PAGAMENTO" | "TRANSFERENCIA";
  vencimento: string;
  descricao: string;
  contato: string;
  categoria: string;
  valorPrevisto: number;
  emAberto: number;
};

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Uma linha selecionada para conciliar contra a transação. */
type Selecao = { lancamentoId: string; valorTexto: string; jurosTexto: string };

function CartaoTransacao({
  transacao,
  candidatos,
  onConciliado,
}: {
  transacao: TransacaoPendente;
  candidatos: Candidato[];
  onConciliado: () => void;
}) {
  const entrada = transacao.valor > 0;
  const valorAbsoluto = Math.abs(transacao.valor);

  // Entrada de extrato só casa com recebimento; saída, só com pagamento.
  const elegiveis = useMemo(
    () => candidatos.filter((c) => c.tipo === (entrada ? "RECEBIMENTO" : "PAGAMENTO")),
    [candidatos, entrada],
  );

  // Sugestão: lançamento em aberto com exatamente o valor da transação.
  const sugestao = useMemo(
    () => elegiveis.find((c) => c.emAberto === valorAbsoluto),
    [elegiveis, valorAbsoluto],
  );

  const [selecoes, setSelecoes] = useState<Selecao[]>(() =>
    sugestao
      ? [
          {
            lancamentoId: sugestao.id,
            valorTexto: (sugestao.emAberto / 100).toFixed(2).replace(".", ","),
            jurosTexto: "",
          },
        ]
      : [],
  );
  const [processando, iniciar] = useTransition();

  const totalSelecionado = selecoes.reduce((soma, s) => {
    try {
      return soma + paraCentavos(s.valorTexto || "0");
    } catch {
      return soma;
    }
  }, 0);

  const diferenca = valorAbsoluto - totalSelecionado;

  function adicionarLinha(lancamentoId: string) {
    const candidato = elegiveis.find((c) => c.id === lancamentoId);
    if (!candidato) return;
    if (selecoes.some((s) => s.lancamentoId === lancamentoId)) return;

    // Propõe o menor entre o que falta na transação e o que falta no lançamento.
    const restante = Math.max(0, diferenca);
    const proposto = Math.min(candidato.emAberto, restante || candidato.emAberto);

    setSelecoes((atual) => [
      ...atual,
      {
        lancamentoId,
        valorTexto: (proposto / 100).toFixed(2).replace(".", ","),
        jurosTexto: "",
      },
    ]);
  }

  function conciliar() {
    if (selecoes.length === 0) {
      toast.error("Selecione ao menos um lançamento.");
      return;
    }

    let linhas;
    try {
      linhas = selecoes.map((s) => ({
        lancamentoId: s.lancamentoId,
        valor: paraCentavos(s.valorTexto || "0"),
        ...(s.jurosTexto ? { juros: paraCentavos(s.jurosTexto) } : {}),
      }));
    } catch {
      toast.error("Há valor inválido entre os lançamentos selecionados.");
      return;
    }

    iniciar(async () => {
      const r = await conciliarAction(transacao.id, linhas);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success(
        r.dados.restante > 0
          ? `Conciliado. Restam ${formatMoney(r.dados.restante)} nesta transação.`
          : "Transação conciliada.",
      );
      onConciliado();
    });
  }

  function ignorar() {
    iniciar(async () => {
      const r = await ignorarTransacaoAction(transacao.id);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      toast.success("Transação ignorada.");
      onConciliado();
    });
  }

  return (
    <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={
              entrada
                ? "mt-0.5 flex size-8 items-center justify-center rounded-full bg-[#ecfdf5] text-[#218358]"
                : "mt-0.5 flex size-8 items-center justify-center rounded-full bg-[#fff5f5] text-[#e5484d]"
            }
          >
            {entrada ? (
              <ArrowDownLeft className="size-4" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold">{transacao.descricao}</p>
            <p className="text-muted-foreground text-xs">
              {formatarData(transacao.data)} · {transacao.contaNome}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={
              entrada
                ? "text-lg font-bold text-[#0d9488]"
                : "text-lg font-bold text-[#e5484d]"
            }
          >
            {formatMoney(valorAbsoluto)}
          </p>
          <Badge variant="secondary" className="rounded-full text-[11px]">
            {entrada ? "Entrada" : "Saída"}
          </Badge>
        </div>
      </div>

      <Separator />

      {elegiveis.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum {entrada ? "recebimento" : "pagamento"} em aberto para casar com esta
          transação. Cadastre o lançamento primeiro ou ignore a transação.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {selecoes.map((selecao) => {
            const candidato = elegiveis.find((c) => c.id === selecao.lancamentoId);
            if (!candidato) return null;

            return (
              <div
                key={selecao.lancamentoId}
                className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-3"
              >
                <div className="min-w-[220px] flex-1">
                  <p className="text-sm font-medium">{candidato.descricao}</p>
                  <p className="text-muted-foreground text-xs">
                    {candidato.contato} · vence {formatarData(candidato.vencimento)} · em
                    aberto {formatMoney(candidato.emAberto)}
                  </p>
                </div>
                <div className="flex w-[140px] flex-col gap-1">
                  <Label className="text-xs" htmlFor={`valor-${selecao.lancamentoId}`}>
                    Valor conciliado
                  </Label>
                  <Input
                    id={`valor-${selecao.lancamentoId}`}
                    value={selecao.valorTexto}
                    onChange={(e) =>
                      setSelecoes((atual) =>
                        atual.map((s) =>
                          s.lancamentoId === selecao.lancamentoId
                            ? { ...s, valorTexto: e.target.value }
                            : s,
                        ),
                      )
                    }
                  />
                </div>
                <div className="flex w-[120px] flex-col gap-1">
                  <Label className="text-xs" htmlFor={`juros-${selecao.lancamentoId}`}>
                    Juros/multa
                  </Label>
                  <Input
                    id={`juros-${selecao.lancamentoId}`}
                    placeholder="0,00"
                    value={selecao.jurosTexto}
                    onChange={(e) =>
                      setSelecoes((atual) =>
                        atual.map((s) =>
                          s.lancamentoId === selecao.lancamentoId
                            ? { ...s, jurosTexto: e.target.value }
                            : s,
                        ),
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remover lançamento"
                  onClick={() =>
                    setSelecoes((atual) =>
                      atual.filter((s) => s.lancamentoId !== selecao.lancamentoId),
                    )
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Select value="" onValueChange={adicionarLinha}>
              <SelectTrigger className="w-[380px]">
                <SelectValue
                  placeholder={
                    selecoes.length === 0
                      ? "Selecionar lançamento..."
                      : "Adicionar outro lançamento..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {elegiveis
                  .filter((c) => !selecoes.some((s) => s.lancamentoId === c.id))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.descricao} — {c.contato} — {formatMoney(c.emAberto)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {selecoes.length > 0 ? (
              <p
                className={
                  diferenca === 0
                    ? "text-sm font-medium text-[#218358]"
                    : "text-sm font-medium text-[#f76b15]"
                }
              >
                {diferenca === 0
                  ? "Valores batem exatamente."
                  : diferenca > 0
                    ? `Faltam ${formatMoney(diferenca)} para fechar a transação.`
                    : `Excedendo em ${formatMoney(-diferenca)}.`}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={conciliar}
          disabled={processando || selecoes.length === 0 || diferenca < 0}
        >
          <Check className="size-4" />
          Conciliar
        </Button>
        <Button variant="outline" onClick={ignorar} disabled={processando}>
          <EyeOff className="size-4" />
          Ignorar
        </Button>
      </div>
    </div>
  );
}

export function ConciliacaoView({
  transacoes,
  candidatos,
  contas,
}: {
  transacoes: TransacaoPendente[];
  candidatos: Candidato[];
  contas: { id: string; nome: string; banco: string }[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"todas" | "entradas" | "saidas">("todas");

  const filtradas = useMemo(() => {
    if (tab === "entradas") return transacoes.filter((t) => t.valor > 0);
    if (tab === "saidas") return transacoes.filter((t) => t.valor < 0);
    return transacoes;
  }, [transacoes, tab]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conciliação bancária</h1>
          <p className="text-muted-foreground text-sm">
            Transações do extrato que ainda não foram vinculadas a um lançamento.
          </p>
        </div>
        {contas.length > 0 ? (
          <ImportarOfxDialog contaId={contas[0].id} contaNome={contas[0].nome} />
        ) : null}
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="todas">Todas ({transacoes.length})</TabsTrigger>
          <TabsTrigger value="entradas">
            Entradas ({transacoes.filter((t) => t.valor > 0).length})
          </TabsTrigger>
          <TabsTrigger value="saidas">
            Saídas ({transacoes.filter((t) => t.valor < 0).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtradas.length === 0 ? (
        <div className="bg-card border-border flex flex-col items-center gap-3 rounded-xl border p-12 text-center shadow-sm">
          <p className="font-medium">Nenhuma transação pendente.</p>
          <p className="text-muted-foreground text-sm">
            {transacoes.length === 0
              ? "Importe um extrato OFX para começar a conciliar."
              : "Não há transações neste filtro."}
          </p>
          {contas.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Cadastre uma conta bancária própria antes de importar o extrato.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtradas.map((transacao) => (
            <CartaoTransacao
              key={transacao.id}
              transacao={transacao}
              candidatos={candidatos}
              onConciliado={() => router.refresh()}
            />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        <Plus className="mr-1 inline size-3" />
        Lançamentos precisam existir antes de aparecer aqui: cadastre em Contas a
        receber ou Contas a pagar.
      </p>
    </div>
  );
}
