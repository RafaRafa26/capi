import "server-only";

import { comOrganizacao } from "@/db/client";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import { lerOfx } from "./ofx";

export type ResultadoImportacao = {
  importacaoId: string;
  lidas: number;
  importadas: number;
  duplicadas: number;
  periodoInicio: string | null;
  periodoFim: string | null;
};

/**
 * Importa um extrato OFX para uma conta própria.
 *
 * A deduplicação (RN-16) é do banco, não do código: a restrição única
 * (conta_bancaria_id, identificador_banco) faz `skipDuplicates` descartar o
 * que já existe. Reimportar o mesmo arquivo é seguro por construção — mesmo
 * que duas importações rodem ao mesmo tempo.
 */
export async function importarOfx(
  organizacaoId: string,
  usuarioId: string,
  contaBancariaId: string,
  nomeArquivo: string,
  conteudo: string,
): Promise<ResultadoImportacao> {
  const extrato = lerOfx(conteudo);

  if (extrato.transacoes.length === 0) {
    throw new ErroDeNegocio("O arquivo não contém nenhuma transação.");
  }

  return comOrganizacao(organizacaoId, async (tx) => {
    const conta = await tx.contaBancaria.findUnique({
      where: { id: contaBancariaId },
    });
    if (!conta) throw new NaoEncontrado("Conta bancária");

    // Conta de terceiro não tem extrato (§5.1) — permitir importação aqui
    // abriria o caminho para gerar custódia sobre dinheiro que nunca passou
    // pela organização (RN-21).
    if (conta.natureza !== "PROPRIA") {
      throw new ErroDeNegocio(
        "Só é possível importar extrato em conta própria. Contas de terceiro liquidam por baixa manual.",
      );
    }

    const inicio = extrato.periodoInicio ?? extrato.transacoes[0].data;
    const fim = extrato.periodoFim ?? extrato.transacoes.at(-1)!.data;

    const importacao = await tx.importacao.create({
      data: {
        organizacaoId,
        contaBancariaId,
        usuarioId,
        arquivo: nomeArquivo,
        periodoInicio: new Date(`${inicio}T00:00:00Z`),
        periodoFim: new Date(`${fim}T00:00:00Z`),
        totalLidas: extrato.transacoes.length,
      },
    });

    const { count } = await tx.transacaoBancaria.createMany({
      data: extrato.transacoes.map((t) => ({
        organizacaoId,
        contaBancariaId,
        importacaoId: importacao.id,
        identificadorBanco: t.identificadorBanco,
        data: new Date(`${t.data}T00:00:00Z`),
        valor: t.valor,
        descricao: t.descricao,
      })),
      skipDuplicates: true,
    });

    await tx.importacao.update({
      where: { id: importacao.id },
      data: { totalImportadas: count },
    });

    return {
      importacaoId: importacao.id,
      lidas: extrato.transacoes.length,
      importadas: count,
      duplicadas: extrato.transacoes.length - count,
      periodoInicio: inicio,
      periodoFim: fim,
    };
  });
}

export type LinhaExtrato = {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  status: "PENDENTE" | "CONCILIADA" | "IGNORADA";
  saldo: number;
};

/**
 * Extrato da conta: transações em ordem cronológica com saldo corrente,
 * partindo do saldo inicial cadastrado.
 */
export async function extratoDaConta(
  organizacaoId: string,
  contaBancariaId: string,
): Promise<{ linhas: LinhaExtrato[]; saldoInicial: number; saldoFinal: number }> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const conta = await tx.contaBancaria.findUnique({
      where: { id: contaBancariaId },
    });
    if (!conta) throw new NaoEncontrado("Conta bancária");

    const transacoes = await tx.transacaoBancaria.findMany({
      where: { contaBancariaId },
      orderBy: [{ data: "asc" }, { criadoEm: "asc" }],
      select: {
        id: true,
        data: true,
        descricao: true,
        valor: true,
        status: true,
      },
    });

    let saldo = conta.saldoInicial;
    const linhas = transacoes.map((t) => {
      saldo += t.valor;
      return {
        id: t.id,
        data: t.data.toISOString().slice(0, 10),
        descricao: t.descricao,
        valor: t.valor,
        status: t.status,
        saldo,
      };
    });

    return { linhas, saldoInicial: conta.saldoInicial, saldoFinal: saldo };
  });
}

/** Transações ainda não resolvidas — a fila da tela de conciliação. */
export async function transacoesPendentes(
  organizacaoId: string,
  contaBancariaId?: string,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const linhas = await tx.transacaoBancaria.findMany({
      where: {
        status: "PENDENTE",
        ...(contaBancariaId ? { contaBancariaId } : {}),
      },
      orderBy: [{ data: "asc" }],
      select: {
        id: true,
        data: true,
        descricao: true,
        valor: true,
        contaBancaria: { select: { id: true, nome: true } },
      },
    });

    return linhas.map((t) => ({
      id: t.id,
      data: t.data.toISOString().slice(0, 10),
      descricao: t.descricao,
      valor: t.valor,
      contaId: t.contaBancaria.id,
      contaNome: t.contaBancaria.nome,
    }));
  });
}

export async function ignorarTransacao(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const transacao = await tx.transacaoBancaria.findUnique({ where: { id } });
    if (!transacao) throw new NaoEncontrado("Transação");
    if (transacao.status === "CONCILIADA") {
      throw new ErroDeNegocio(
        "Transação já conciliada. Desfaça a conciliação antes de ignorá-la.",
      );
    }
    await tx.transacaoBancaria.update({
      where: { id },
      data: { status: "IGNORADA" },
    });
  });
}

export async function reabrirTransacao(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const transacao = await tx.transacaoBancaria.findUnique({ where: { id } });
    if (!transacao) throw new NaoEncontrado("Transação");
    if (transacao.status === "CONCILIADA") {
      throw new ErroDeNegocio("Transação já conciliada.");
    }
    await tx.transacaoBancaria.update({
      where: { id },
      data: { status: "PENDENTE" },
    });
  });
}
