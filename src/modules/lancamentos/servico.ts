import "server-only";

import { z } from "zod";

import { comOrganizacao } from "@/db/client";
import { saldoDisponivel } from "@/modules/custodia/servico";
import { paraCentavos, validarDestinacoes } from "@/shared/dinheiro";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import { situacaoPorVencimento } from "./dominio";
import type { LancamentoDaLista } from "./tipos";

export const destinacaoEsquema = z.object({
  favorecidoId: z.uuid("Selecione o favorecido."),
  modo: z.enum(["PERCENTUAL", "VALOR_FIXO"]),
  // PERCENTUAL em base 10.000 (1% = 100); VALOR_FIXO em centavos.
  valor: z.number().int().nonnegative(),
});

export const lancamentoEsquema = z.object({
  tipo: z.enum(["RECEBIMENTO", "PAGAMENTO"]),
  contatoId: z.uuid("Selecione o contato."),
  categoriaId: z.uuid("Selecione a categoria."),
  centroCustoId: z.uuid().nullable().optional(),
  contaBancariaId: z.uuid().nullable().optional(),
  descricao: z.string().trim().max(300).nullable().optional(),
  vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento."),
  valorPrevisto: z.number().int().positive("O valor precisa ser maior que zero."),
  numeroParcela: z.number().int().positive().nullable().optional(),
  totalParcelas: z.number().int().positive().nullable().optional(),
  destinacoes: z.array(destinacaoEsquema).default([]),
});

export type LancamentoEntrada = z.infer<typeof lancamentoEsquema>;

/** Traduz o formulário de novo lançamento para a entrada do serviço. */
export function lancamentoDoFormulario(form: FormData) {
  const favorecidos = form.getAll("destinacaoFavorecido").map(String);
  const modos = form.getAll("destinacaoModo").map(String);
  const valores = form.getAll("destinacaoValor").map(String);

  const destinacoes = favorecidos
    .map((favorecidoId, i) => {
      const modo = (modos[i] ?? "PERCENTUAL") as "PERCENTUAL" | "VALOR_FIXO";
      const bruto = valores[i] ?? "0";
      // Percentual também é inteiro: "60" ou "60,5" → 6000 / 6050.
      const valor =
        modo === "PERCENTUAL"
          ? Math.round(Number(bruto.replace(",", ".")) * 100)
          : paraCentavos(bruto);
      return { favorecidoId, modo, valor };
    })
    .filter((d) => d.favorecidoId !== "");

  const parcela = String(form.get("numeroParcela") ?? "");
  const total = String(form.get("totalParcelas") ?? "");

  return {
    tipo: String(form.get("tipo") ?? "RECEBIMENTO"),
    contatoId: String(form.get("contatoId") ?? ""),
    categoriaId: String(form.get("categoriaId") ?? ""),
    centroCustoId: String(form.get("centroCustoId") ?? "") || null,
    contaBancariaId: String(form.get("contaBancariaId") ?? "") || null,
    descricao: String(form.get("descricao") ?? "") || null,
    vencimento: String(form.get("vencimento") ?? ""),
    valorPrevisto: paraCentavos(String(form.get("valorPrevisto") ?? "0")),
    numeroParcela: parcela ? Number(parcela) : null,
    totalParcelas: total ? Number(total) : null,
    destinacoes,
  };
}

export async function criarLancamento(
  organizacaoId: string,
  dados: LancamentoEntrada,
) {
  // RN-04: recebimento exige destinação somando 100% do valor.
  if (dados.tipo === "RECEBIMENTO") {
    const problemas = validarDestinacoes(dados.valorPrevisto, dados.destinacoes);
    if (problemas.length > 0) {
      throw new ErroDeNegocio(problemas[0], "destinacoes");
    }
  }

  return comOrganizacao(organizacaoId, async (tx) => {
    const contato = await tx.contato.findUnique({ where: { id: dados.contatoId } });
    if (!contato) throw new NaoEncontrado("Contato");

    const categoria = await tx.categoria.findUnique({
      where: { id: dados.categoriaId },
    });
    if (!categoria) throw new NaoEncontrado("Categoria");

    const tipoEsperado = dados.tipo === "RECEBIMENTO" ? "RECEITA" : "DESPESA";
    if (categoria.tipo !== tipoEsperado) {
      throw new ErroDeNegocio(
        `Um ${dados.tipo === "RECEBIMENTO" ? "recebimento" : "pagamento"} precisa de categoria de ${tipoEsperado.toLowerCase()}.`,
        "categoriaId",
      );
    }

    return tx.lancamento.create({
      data: {
        organizacaoId,
        tipo: dados.tipo,
        contatoId: dados.contatoId,
        categoriaId: dados.categoriaId,
        centroCustoId: dados.centroCustoId ?? null,
        contaBancariaId: dados.contaBancariaId ?? null,
        descricao: dados.descricao ?? null,
        vencimento: new Date(`${dados.vencimento}T00:00:00Z`),
        valorPrevisto: dados.valorPrevisto,
        numeroParcela: dados.numeroParcela ?? null,
        totalParcelas: dados.totalParcelas ?? null,
        destinacoes: {
          create: dados.destinacoes.map((d, ordem) => ({
            favorecidoId: d.favorecidoId,
            modo: d.modo,
            valor: d.valor,
            ordem,
          })),
        },
      },
      select: { id: true },
    });
  });
}

/**
 * Cria N parcelas a partir de um valor total (espírito da RN-17).
 *
 * A base do parcelamento é sempre o valor total, e o resíduo da divisão vai
 * para a ÚLTIMA parcela (AD-07) — assim a soma das parcelas é exatamente o
 * total, sem centavo sobrando nem faltando.
 *
 * Nota: isto ainda NÃO é a entidade `Contrato` do §5.1 (Fase 3), que guarda
 * partes, itens e propriedade. É o parcelamento simples que a tela do Figma
 * oferece — as parcelas nascem soltas, sem contrato que as agrupe.
 */
export async function criarRecebimentosParcelados(
  organizacaoId: string,
  dados: LancamentoEntrada,
  totalParcelas: number,
  periodicidade: "Mensal" | "Quinzenal" | "Semanal" | "Anual" = "Mensal",
) {
  if (totalParcelas < 1) {
    throw new ErroDeNegocio("O número de parcelas precisa ser ao menos 1.");
  }
  if (totalParcelas > 360) {
    throw new ErroDeNegocio("Número de parcelas acima do limite (360).");
  }

  const base = Math.trunc(dados.valorPrevisto / totalParcelas);
  const valores = Array.from({ length: totalParcelas }, () => base);
  valores[totalParcelas - 1] = dados.valorPrevisto - base * (totalParcelas - 1);

  const criados: { id: string }[] = [];
  for (let i = 0; i < totalParcelas; i++) {
    criados.push(
      await criarLancamento(organizacaoId, {
        ...dados,
        valorPrevisto: valores[i],
        vencimento: avancarVencimento(dados.vencimento, i, periodicidade),
        numeroParcela: i + 1,
        totalParcelas,
        descricao: dados.descricao
          ? `${dados.descricao} — parcela ${i + 1}/${totalParcelas}`
          : `Parcela ${i + 1}/${totalParcelas}`,
      }),
    );
  }

  return criados;
}

/**
 * Avança o vencimento em `passos` períodos.
 *
 * No modo mensal, dia 31 em mês curto cai para o último dia do mês em vez de
 * transbordar para o mês seguinte — que é o que `setMonth` faria sozinho.
 */
function avancarVencimento(
  iso: string,
  passos: number,
  periodicidade: "Mensal" | "Quinzenal" | "Semanal" | "Anual",
): string {
  const base = new Date(`${iso}T00:00:00Z`);

  if (periodicidade === "Semanal" || periodicidade === "Quinzenal") {
    const dias = (periodicidade === "Semanal" ? 7 : 15) * passos;
    base.setUTCDate(base.getUTCDate() + dias);
    return base.toISOString().slice(0, 10);
  }

  const meses = periodicidade === "Anual" ? 12 * passos : passos;
  const diaOriginal = base.getUTCDate();
  const alvo = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + meses, 1),
  );
  const ultimoDiaDoMes = new Date(
    Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0),
  ).getUTCDate();
  alvo.setUTCDate(Math.min(diaOriginal, ultimoDiaDoMes));

  return alvo.toISOString().slice(0, 10);
}

/**
 * Gera um repasse: lançamento de pagamento a um favorecido, limitado ao saldo
 * disponível dele (RN-10). Fica PREVISTO até ser conciliado (RN-11).
 */
export async function gerarRepasse(
  organizacaoId: string,
  favorecidoId: string,
  valor: number,
  vencimento: string,
  categoriaId: string,
  descricao?: string,
) {
  if (valor <= 0) {
    throw new ErroDeNegocio("O valor do repasse precisa ser maior que zero.");
  }

  const disponivel = await saldoDisponivel(organizacaoId, favorecidoId);
  if (valor > disponivel) {
    throw new ErroDeNegocio(
      `Saldo disponível do favorecido é ${formatar(disponivel)}; não é possível repassar ${formatar(valor)}.`,
    );
  }

  return comOrganizacao(organizacaoId, async (tx) => {
    const favorecido = await tx.contato.findUnique({ where: { id: favorecidoId } });
    if (!favorecido) throw new NaoEncontrado("Favorecido");

    return tx.lancamento.create({
      data: {
        organizacaoId,
        tipo: "PAGAMENTO",
        contatoId: favorecidoId,
        categoriaId,
        vencimento: new Date(`${vencimento}T00:00:00Z`),
        valorPrevisto: valor,
        descricao: descricao ?? `Repasse a ${favorecido.nome}`,
        destinacoes: {
          create: [{ favorecidoId, modo: "VALOR_FIXO", valor, ordem: 0 }],
        },
      },
      select: { id: true },
    });
  });
}

/** Cancela um repasse pendente, liberando o saldo reservado (RN-11). */
export async function cancelarLancamento(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const lancamento = await tx.lancamento.findUnique({
      where: { id },
      include: { _count: { select: { liquidacoes: true } } },
    });
    if (!lancamento) throw new NaoEncontrado("Lançamento");

    if (lancamento._count.liquidacoes > 0) {
      throw new ErroDeNegocio(
        "Este lançamento já tem liquidação. Desfaça a liquidação antes de cancelá-lo.",
      );
    }

    await tx.lancamento.update({
      where: { id },
      data: { status: "CANCELADO" },
    });
  });
}

export async function listarLancamentos(
  organizacaoId: string,
  tipo: "RECEBIMENTO" | "PAGAMENTO",
  hoje = new Date(),
): Promise<LancamentoDaLista[]> {
  const linhas = await comOrganizacao(organizacaoId, (tx) =>
    tx.lancamento.findMany({
      where: { tipo, status: { not: "CANCELADO" } },
      orderBy: { vencimento: "asc" },
      select: {
        id: true,
        vencimento: true,
        descricao: true,
        valorPrevisto: true,
        valorLiquidado: true,
        status: true,
        contato: { select: { nome: true } },
        categoria: { select: { nome: true } },
      },
    }),
  );

  return linhas.map((l) => ({
    id: l.id,
    vencimento: l.vencimento.toISOString().slice(0, 10),
    contato: l.contato?.nome ?? "—",
    descricao: l.descricao ?? "—",
    categoria: l.categoria?.nome ?? "—",
    valorPrevisto: l.valorPrevisto,
    valorLiquidado: l.valorLiquidado,
    status: l.status,
    situacao: situacaoPorVencimento(l.status, l.vencimento, hoje),
  }));
}

/** Lançamentos que ainda podem receber liquidação — candidatos da conciliação. */
export async function lancamentosEmAberto(
  organizacaoId: string,
  tipo?: "RECEBIMENTO" | "PAGAMENTO",
) {
  const linhas = await comOrganizacao(organizacaoId, (tx) =>
    tx.lancamento.findMany({
      where: {
        status: { in: ["PREVISTO", "PARCIAL"] },
        ...(tipo ? { tipo } : {}),
      },
      orderBy: { vencimento: "asc" },
      select: {
        id: true,
        tipo: true,
        vencimento: true,
        descricao: true,
        valorPrevisto: true,
        juros: true,
        multa: true,
        desconto: true,
        valorLiquidado: true,
        contato: { select: { nome: true } },
        categoria: { select: { nome: true } },
      },
    }),
  );

  return linhas.map((l) => ({
    id: l.id,
    tipo: l.tipo,
    vencimento: l.vencimento.toISOString().slice(0, 10),
    descricao: l.descricao ?? "—",
    contato: l.contato?.nome ?? "—",
    categoria: l.categoria?.nome ?? "—",
    valorPrevisto: l.valorPrevisto,
    emAberto:
      l.valorPrevisto + l.juros + l.multa - l.desconto - l.valorLiquidado,
  }));
}

function formatar(centavos: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}
