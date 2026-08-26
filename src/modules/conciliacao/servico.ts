import "server-only";

import { comOrganizacao } from "@/db/client";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import { transacoesPendentes } from "@/modules/extrato/servico";
import { lancamentosEmAberto } from "@/modules/lancamentos/servico";
import { parearTransacoes } from "./dominio";

// Serviços que a tela de conciliação precisa e que não existiam: montar os
// pares extrato × lançamento, e criar na hora o lançamento que falta
// (Fase 8 da ARQUITETURA.md — RN-14 e RN-15).

export type TransacaoDaTela = Awaited<
  ReturnType<typeof transacoesPendentes>
>[number];
export type CandidatoDaTela = Awaited<
  ReturnType<typeof lancamentosEmAberto>
>[number];

export type ParConciliacao = {
  transacao: TransacaoDaTela;
  sugestao: CandidatoDaTela | null;
};

/** Transações pendentes já pareadas com o lançamento mais provável. */
export async function paresParaConciliar(
  organizacaoId: string,
  contaBancariaId?: string,
): Promise<{ pares: ParConciliacao[]; candidatos: CandidatoDaTela[] }> {
  const [transacoes, candidatos] = await Promise.all([
    transacoesPendentes(organizacaoId, contaBancariaId),
    lancamentosEmAberto(organizacaoId),
  ]);

  return { pares: parearTransacoes(transacoes, candidatos), candidatos };
}

export type LancamentoAvulso = {
  tipo: "RECEBIMENTO" | "PAGAMENTO";
  contatoId: string | null;
  categoriaId: string;
  descricao: string;
};

/**
 * Cria, direto da tela de conciliação, o lançamento que explica uma transação
 * do extrato — taxa bancária, aporte, receita avulsa (Fase 8).
 *
 * O valor e a data vêm da própria transação: o operador não redigita o que o
 * banco já informou, e não há como divergirem.
 *
 * Sem destinação, de propósito. Este caminho existe para dinheiro da própria
 * organização, que por definição não gera custódia (RN-14) — a liquidação só
 * credita favorecido quando há destinação. Recebimento de terceiro continua
 * sendo cadastrado na tela própria, onde a destinação é obrigatória (RN-04).
 */
export async function criarLancamentoParaTransacao(
  organizacaoId: string,
  transacaoId: string,
  dados: LancamentoAvulso,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const transacao = await tx.transacaoBancaria.findUnique({
      where: { id: transacaoId },
    });
    if (!transacao) throw new NaoEncontrado("Transação bancária");
    if (transacao.status === "CONCILIADA") {
      throw new ErroDeNegocio("Esta transação já foi conciliada.");
    }

    const entrada = transacao.valor > 0;
    if (entrada !== (dados.tipo === "RECEBIMENTO")) {
      throw new ErroDeNegocio(
        entrada
          ? "Uma entrada do extrato só pode virar um recebimento."
          : "Uma saída do extrato só pode virar um pagamento.",
      );
    }

    const categoria = await tx.categoria.findUnique({
      where: { id: dados.categoriaId },
    });
    if (!categoria) throw new NaoEncontrado("Categoria");

    const tipoEsperado = dados.tipo === "RECEBIMENTO" ? "RECEITA" : "DESPESA";
    if (categoria.tipo !== tipoEsperado) {
      throw new ErroDeNegocio(
        `Selecione uma categoria de ${tipoEsperado.toLowerCase()}.`,
        "categoriaId",
      );
    }

    if (dados.contatoId) {
      const contato = await tx.contato.findUnique({
        where: { id: dados.contatoId },
      });
      if (!contato) throw new NaoEncontrado("Contato");
    }

    const lancamento = await tx.lancamento.create({
      data: {
        organizacaoId,
        tipo: dados.tipo,
        contatoId: dados.contatoId,
        categoriaId: dados.categoriaId,
        contaBancariaId: transacao.contaBancariaId,
        descricao: dados.descricao || transacao.descricao,
        vencimento: transacao.data,
        valorPrevisto: Math.abs(transacao.valor),
      },
      select: { id: true },
    });

    // Devolve o valor junto para a borda conciliar sem reconsultar.
    return { lancamentoId: lancamento.id, valor: Math.abs(transacao.valor) };
  });
}

/**
 * Transferência entre contas próprias (RN-15), criada da tela de conciliação.
 *
 * Gera as DUAS pernas — saída na origem, entrada no destino — ligadas entre
 * si, e devolve a que corresponde a esta transação para ser conciliada. A
 * perna oposta fica prevista, esperando aparecer no extrato da outra conta.
 *
 * O valor é herdado da transação e a descrição é gerada: o operador informa
 * apenas a conta contrária, como manda a regra.
 */
export async function criarTransferenciaParaTransacao(
  organizacaoId: string,
  transacaoId: string,
  contaContrariaId: string,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const transacao = await tx.transacaoBancaria.findUnique({
      where: { id: transacaoId },
      include: { contaBancaria: true },
    });
    if (!transacao) throw new NaoEncontrado("Transação bancária");
    if (transacao.status === "CONCILIADA") {
      throw new ErroDeNegocio("Esta transação já foi conciliada.");
    }

    const contraria = await tx.contaBancaria.findUnique({
      where: { id: contaContrariaId },
    });
    if (!contraria) throw new NaoEncontrado("Conta de destino");

    if (contraria.id === transacao.contaBancariaId) {
      throw new ErroDeNegocio("A conta de destino precisa ser diferente da origem.");
    }
    // RN-15 fala em transferência entre contas DA PRÓPRIA organização. Conta
    // de terceiro não participa: dinheiro que sai para lá é repasse, não
    // transferência interna.
    if (contraria.natureza !== "PROPRIA") {
      throw new ErroDeNegocio(
        "Transferência interna só entre contas próprias. Para conta de terceiro, registre um pagamento.",
      );
    }

    const valor = Math.abs(transacao.valor);
    const saiuDaqui = transacao.valor < 0;
    const origem = saiuDaqui ? transacao.contaBancaria : contraria;
    const destino = saiuDaqui ? contraria : transacao.contaBancaria;
    const descricao = `Transferência de ${origem.nome} para ${destino.nome}`;

    // Perna oposta primeiro, para a desta transação já nascer apontando nela.
    const oposta = await tx.lancamento.create({
      data: {
        organizacaoId,
        tipo: "TRANSFERENCIA",
        contaBancariaId: saiuDaqui ? destino.id : origem.id,
        contaDestinoId: saiuDaqui ? origem.id : destino.id,
        vencimento: transacao.data,
        valorPrevisto: valor,
        descricao,
      },
      select: { id: true },
    });

    const desta = await tx.lancamento.create({
      data: {
        organizacaoId,
        tipo: "TRANSFERENCIA",
        contaBancariaId: transacao.contaBancariaId,
        contaDestinoId: contraria.id,
        vencimento: transacao.data,
        valorPrevisto: valor,
        descricao,
        lancamentoParId: oposta.id,
      },
      select: { id: true },
    });

    return { lancamentoId: desta.id, lancamentoParId: oposta.id, valor, descricao };
  });
}
