"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  Landmark,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  aprovarParAction,
  criarEConciliarAction,
  criarTransferenciaEConciliarAction,
  ignorarTransacaoAction,
} from "@/app/(app)/conciliacao/actions";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";
import { ImportarOfxDialog } from "@/components/extrato/importar-ofx-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import type { ParConciliacao, CandidatoDaTela } from "@/modules/conciliacao/servico";

type Opcao = { id: string; nome: string };
type Conta = { id: string; nome: string; banco: string };

const SEM_CONTATO = "__sem_contato__";

function formatarData(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ------------------------------------------------- coluna do extrato (OFX)

function ColunaBanco({
  transacao,
  onIgnorar,
  ocupado,
}: {
  transacao: ParConciliacao["transacao"];
  onIgnorar: () => void;
  ocupado: boolean;
}) {
  const entrada = transacao.valor > 0;

  return (
    <div className="relative flex min-w-0 flex-1 flex-col gap-2">
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-full",
          entrada ? "bg-[#f0fdfa]" : "bg-[#fef2f2]",
        )}
      >
        {entrada ? (
          <ArrowUpRight className="size-[18px] text-[#0d9488]" />
        ) : (
          <ArrowDownLeft className="size-[18px] text-[#dc2626]" />
        )}
      </div>

      <div className="flex flex-col gap-1 pr-8">
        <p className="truncate text-[13px] font-semibold" title={transacao.descricao}>
          {transacao.descricao}
        </p>
        <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
          <span>{formatarData(transacao.data)}</span>
          <span className="text-[#99a1ab]">|</span>
          <span>{entrada ? "Entrada" : "Saída"}</span>
          <span className="text-[#99a1ab]">|</span>
          <span className="truncate">{transacao.contaNome}</span>
        </div>
        <p
          className={cn(
            "text-sm font-semibold",
            entrada ? "text-[#0d9488]" : "text-[#dc2626]",
          )}
        >
          {entrada ? "" : "− "}
          {formatMoney(Math.abs(transacao.valor))}
        </p>
      </div>

      <button
        type="button"
        onClick={onIgnorar}
        disabled={ocupado}
        aria-label="Ignorar esta transação"
        title="Ignorar esta transação"
        className="text-muted-foreground hover:text-destructive absolute right-2 bottom-0 disabled:opacity-40"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// -------------------------------------- coluna do Capi: lançamento pareado

function LancamentoPareado({
  sugestao,
  onTrocar,
}: {
  sugestao: CandidatoDaTela;
  onTrocar: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="truncate text-[13px] font-semibold">
        {sugestao.contato !== "—" ? `${sugestao.contato} — ` : ""}
        {sugestao.descricao}
      </p>
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-[11px]">
        {sugestao.favorecido ? (
          <>
            <span className="truncate">{sugestao.favorecido}</span>
            <span className="text-[#99a1ab]">|</span>
          </>
        ) : null}
        <span>{formatarData(sugestao.vencimento)}</span>
        <span className="text-[#99a1ab]">|</span>
        <span className="truncate">{sugestao.categoria}</span>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold">{formatMoney(sugestao.emAberto)}</p>
        <button
          type="button"
          onClick={onTrocar}
          className="text-muted-foreground hover:text-foreground text-[11px] underline underline-offset-2"
        >
          trocar lançamento
        </button>
      </div>
    </div>
  );
}

// ------------------------- coluna do Capi: formulário quando não há par

function FormularioLancamento({
  transacao,
  candidatos,
  contas,
  contatos,
  categorias,
  ocupado,
  onCriar,
  onTransferir,
  onVincular,
}: {
  transacao: ParConciliacao["transacao"];
  candidatos: CandidatoDaTela[];
  contas: Conta[];
  contatos: Opcao[];
  categorias: { id: string; nome: string; tipo: "RECEITA" | "DESPESA" }[];
  ocupado: boolean;
  onCriar: (dados: {
    tipo: "RECEBIMENTO" | "PAGAMENTO";
    contatoId: string | null;
    categoriaId: string;
    descricao: string;
  }) => void;
  onTransferir: (contaContrariaId: string) => void;
  onVincular: (lancamentoId: string) => void;
}) {
  const entrada = transacao.valor > 0;
  const tipoLancamento = entrada ? "RECEBIMENTO" : "PAGAMENTO";

  const [modo, setModo] = useState<"LANCAMENTO" | "TRANSFERENCIA">("LANCAMENTO");
  const [buscando, setBuscando] = useState(false);
  const [contatoId, setContatoId] = useState(SEM_CONTATO);
  const [categoriaId, setCategoriaId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [contaDestino, setContaDestino] = useState("");
  const [vinculoId, setVinculoId] = useState("");

  // A categoria precisa combinar com o sentido do dinheiro no extrato.
  const categoriasDoTipo = useMemo(
    () => categorias.filter((c) => c.tipo === (entrada ? "RECEITA" : "DESPESA")),
    [categorias, entrada],
  );

  // Só faz sentido oferecer lançamentos do mesmo sentido da transação.
  const elegiveis = useMemo(
    () => candidatos.filter((c) => c.tipo === tipoLancamento),
    [candidatos, tipoLancamento],
  );

  const outrasContas = contas.filter((c) => c.id !== transacao.contaId);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Select
          value={modo}
          onValueChange={(v) => {
            setModo(v as typeof modo);
            setBuscando(false);
          }}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="O que é esta transação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LANCAMENTO">
              {entrada ? "Recebimento" : "Pagamento"}
            </SelectItem>
            <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9"
          aria-pressed={buscando}
          onClick={() => setBuscando((v) => !v)}
        >
          <Search className="size-4" />
          Buscar
        </Button>
      </div>

      {buscando ? (
        <Select value={vinculoId} onValueChange={setVinculoId}>
          <SelectTrigger className="h-9 w-full" aria-label="Lançamento existente">
            <SelectValue
              placeholder={`Vincular a um dos ${elegiveis.length} lançamentos em aberto...`}
            />
          </SelectTrigger>
          <SelectContent>
            {elegiveis.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.descricao} — {c.contato} — {formatMoney(c.emAberto)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {!buscando && modo === "LANCAMENTO" ? (
        <>
          <div className="flex gap-3">
            <Select value={contatoId} onValueChange={setContatoId}>
              <SelectTrigger className="h-9 flex-1" aria-label="Contato">
                <SelectValue placeholder="Contato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_CONTATO}>Sem contato</SelectItem>
                {contatos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="h-9 flex-1" aria-label="Categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categoriasDoTipo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            className="h-9"
            placeholder="Descrição"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          <p className="text-muted-foreground text-[11px]">
            Valor e data vêm do extrato: {formatMoney(Math.abs(transacao.valor))} em{" "}
            {formatarData(transacao.data)}.
          </p>
        </>
      ) : null}

      {!buscando && modo === "TRANSFERENCIA" ? (
        <>
          <Select value={contaDestino} onValueChange={setContaDestino}>
            <SelectTrigger className="h-9 w-full" aria-label="Conta contrária">
              <SelectValue
                placeholder={entrada ? "Conta de origem" : "Conta de destino"}
              />
            </SelectTrigger>
            <SelectContent>
              {outrasContas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} — {c.banco}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[11px]">
            A outra perna fica prevista, aguardando o extrato da conta contrária.
          </p>
        </>
      ) : null}

      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={ocupado}
          onClick={() => {
            if (buscando) return onVincular(vinculoId);
            if (modo === "TRANSFERENCIA") return onTransferir(contaDestino);
            onCriar({
              tipo: tipoLancamento,
              contatoId: contatoId === SEM_CONTATO ? null : contatoId,
              categoriaId,
              descricao,
            });
          }}
        >
          <Check className="size-4" />
          {buscando ? "Vincular e conciliar" : "Criar e conciliar"}
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- Match Row

function LinhaConciliacao({
  par,
  candidatos,
  contas,
  contatos,
  categorias,
  onFeito,
}: {
  par: ParConciliacao;
  candidatos: CandidatoDaTela[];
  contas: Conta[];
  contatos: Opcao[];
  categorias: { id: string; nome: string; tipo: "RECEITA" | "DESPESA" }[];
  onFeito: () => void;
}) {
  const [ocupado, iniciar] = useTransition();
  const [trocando, setTrocando] = useState(false);
  const sugestao = trocando ? null : par.sugestao;

  function executar(acao: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) {
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível concluir.");
        return;
      }
      toast.success(sucesso);
      onFeito();
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-4">
      <ColunaBanco
        transacao={par.transacao}
        ocupado={ocupado}
        onIgnorar={() =>
          executar(
            () => ignorarTransacaoAction(par.transacao.id),
            "Transação ignorada.",
          )
        }
      />

      <Separator orientation="vertical" className="hidden self-stretch md:block" />
      <Separator className="md:hidden" />

      {sugestao ? (
        <LancamentoPareado sugestao={sugestao} onTrocar={() => setTrocando(true)} />
      ) : (
        <FormularioLancamento
          transacao={par.transacao}
          candidatos={candidatos}
          contas={contas}
          contatos={contatos}
          categorias={categorias}
          ocupado={ocupado}
          onCriar={(dados) => {
            if (!dados.categoriaId) return toast.error("Selecione a categoria.");
            executar(
              () => criarEConciliarAction(par.transacao.id, dados),
              "Lançamento criado e conciliado.",
            );
          }}
          onTransferir={(contaId) => {
            if (!contaId) return toast.error("Selecione a conta contrária.");
            executar(
              () => criarTransferenciaEConciliarAction(par.transacao.id, contaId),
              "Transferência registrada e conciliada.",
            );
          }}
          onVincular={(lancamentoId) => {
            if (!lancamentoId) return toast.error("Selecione o lançamento.");
            const alvo = candidatos.find((c) => c.id === lancamentoId);
            if (!alvo) return;
            executar(
              () =>
                aprovarParAction(
                  par.transacao.id,
                  lancamentoId,
                  Math.min(alvo.emAberto, Math.abs(par.transacao.valor)),
                ),
              "Transação conciliada.",
            );
          }}
        />
      )}

      <div className="flex items-center gap-3 md:shrink-0">
        {sugestao ? (
          <>
            <button
              type="button"
              disabled={ocupado}
              aria-label="Aprovar conciliação"
              title="Aprovar conciliação"
              onClick={() =>
                executar(
                  () =>
                    aprovarParAction(
                      par.transacao.id,
                      sugestao.id,
                      Math.min(sugestao.emAberto, Math.abs(par.transacao.valor)),
                    ),
                  "Transação conciliada.",
                )
              }
              className="flex size-9 items-center justify-center rounded-full bg-[#dcfce7] text-[#166534] transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <Check className="size-[18px]" />
            </button>
            <button
              type="button"
              disabled={ocupado}
              aria-label="Trocar lançamento"
              title="Trocar lançamento"
              onClick={() => setTrocando(true)}
              className="flex size-9 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626] transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              <ArrowLeftRight className="size-[18px]" />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- a tela

export function ConciliacaoView({
  pares,
  candidatos,
  contas,
  contatos,
  categorias,
  contaSelecionada,
}: {
  pares: ParConciliacao[];
  candidatos: CandidatoDaTela[];
  contas: Conta[];
  contatos: Opcao[];
  categorias: { id: string; nome: string; tipo: "RECEITA" | "DESPESA" }[];
  contaSelecionada: string | null;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"todas" | "entradas" | "saidas">("todas");
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<DateRange | undefined>(undefined);
  const [ordem, setOrdem] = useState<"data" | "maior" | "menor">("data");

  const contaAtual = contas.find((c) => c.id === contaSelecionada) ?? contas[0];

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const de = periodo?.from ? periodo.from.getTime() : null;
    const ate = periodo?.to ? periodo.to.getTime() : de;

    return pares.filter(({ transacao }) => {
      if (aba === "entradas" && transacao.valor <= 0) return false;
      if (aba === "saidas" && transacao.valor >= 0) return false;

      if (termo && !transacao.descricao.toLowerCase().includes(termo)) return false;

      if (de !== null) {
        const dia = Date.parse(`${transacao.data}T00:00:00`);
        if (dia < de || (ate !== null && dia > ate)) return false;
      }
      return true;
    });
  }, [pares, aba, busca, periodo]);

  // Ordenar por valor ajuda a atacar primeiro o que mais move o caixa.
  const ordenados = useMemo(() => {
    if (ordem === "data") return visiveis;
    const porValor = [...visiveis];
    porValor.sort((a, b) => {
      const va = Math.abs(a.transacao.valor);
      const vb = Math.abs(b.transacao.valor);
      return ordem === "maior" ? vb - va : va - vb;
    });
    return porValor;
  }, [visiveis, ordem]);

  const entradas = pares.filter((p) => p.transacao.valor > 0).length;
  const saidas = pares.length - entradas;

  return (
    <div className="flex flex-1 flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-semibold">Conciliação</h1>

        <div className="flex flex-wrap items-center gap-3">
          {contas.length > 0 ? (
            <Select
              value={contaAtual?.id ?? ""}
              onValueChange={(id) => router.push(`/conciliacao?conta=${id}`)}
            >
              <SelectTrigger className="h-9" aria-label="Conta bancária">
                <span className="text-muted-foreground mr-1 text-[13px]">Conta:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} — {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {contaAtual ? (
            <ImportarOfxDialog contaId={contaAtual.id} contaNome={contaAtual.nome} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
          <TabsList>
            <TabsTrigger value="todas">Todas ({pares.length})</TabsTrigger>
            <TabsTrigger value="entradas">Entradas ({entradas})</TabsTrigger>
            <TabsTrigger value="saidas">Saídas ({saidas})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={periodo} onChange={setPeriodo} />
          <div className="relative">
            <Input
              className="h-9 w-[228px] pr-9"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" />
          </div>

          <Select value={ordem} onValueChange={(v) => setOrdem(v as typeof ordem)}>
            <SelectTrigger className="h-9" aria-label="Ordenar por valor">
              <span className="text-muted-foreground mr-1 text-[13px]">Valor</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Por data</SelectItem>
              <SelectItem value="maior">Maior primeiro</SelectItem>
              <SelectItem value="menor">Menor primeiro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Cabeçalho das duas colunas: de um lado o que o banco diz, do outro o
          que o sistema tem. É a leitura que a tela inteira propõe. */}
      <div className="flex items-center py-3">
        <div className="flex flex-1 items-center gap-2 pl-6">
          <Landmark className="size-[18px]" />
          <p className="text-sm font-semibold">Lançamentos do Banco</p>
        </div>
        <div className="hidden flex-1 items-center gap-2 pl-4 md:flex">
          <Receipt className="size-[18px]" />
          <p className="text-sm font-semibold">Lançamentos do Capi</p>
        </div>
        <div className="w-[84px] shrink-0" />
      </div>

      <Separator />

      <div className="bg-card border-border overflow-hidden rounded-[10px] border">
        {ordenados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center">
            <p className="font-medium">
              {pares.length === 0
                ? "Nenhuma transação pendente."
                : "Nada neste filtro."}
            </p>
            <p className="text-muted-foreground text-sm">
              {pares.length === 0
                ? "Importe um extrato OFX para começar a conciliar."
                : "Ajuste a aba, a busca ou o período."}
            </p>
          </div>
        ) : (
          ordenados.map((par, i) => (
            <div key={par.transacao.id}>
              {i > 0 ? <div className="bg-[#d9d9d9] h-px w-full" /> : null}
              <LinhaConciliacao
                par={par}
                candidatos={candidatos}
                contas={contas}
                contatos={contatos}
                categorias={categorias}
                onFeito={() => router.refresh()}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
