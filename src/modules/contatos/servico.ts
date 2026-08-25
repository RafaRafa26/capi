import "server-only";

import { comOrganizacao } from "@/db/client";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import type { Contato } from "./tipos";
import type { ContatoEntrada } from "./esquema";

const CAMPOS = {
  id: true,
  nome: true,
  tipoPessoa: true,
  documento: true,
  papeis: true,
  ativo: true,
  telefone: true,
  email: true,
  cidade: true,
  estado: true,
  banco: true,
  tipoConta: true,
  agencia: true,
  conta: true,
  tipoChavePix: true,
  chavePix: true,
} as const;

export async function listarContatos(organizacaoId: string): Promise<Contato[]> {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.contato.findMany({ select: CAMPOS, orderBy: { nome: "asc" } }),
  );
}

export async function buscarContato(
  organizacaoId: string,
  id: string,
): Promise<Contato | null> {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.contato.findUnique({ where: { id }, select: CAMPOS }),
  );
}

/** Favorecidos ativos — quem pode receber destinação de um recebimento. */
export async function listarFavorecidos(organizacaoId: string) {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.contato.findMany({
      where: { ativo: true, papeis: { has: "FAVORECIDO" } },
      select: { id: true, nome: true, documento: true },
      orderBy: { nome: "asc" },
    }),
  );
}

export async function criarContato(
  organizacaoId: string,
  dados: ContatoEntrada,
): Promise<Contato> {
  return comOrganizacao(organizacaoId, async (tx) => {
    await recusarDocumentoDuplicado(tx, dados.documento);
    return tx.contato.create({
      data: { organizacaoId, ...paraBanco(dados) },
      select: CAMPOS,
    });
  });
}

export async function atualizarContato(
  organizacaoId: string,
  id: string,
  dados: ContatoEntrada,
): Promise<Contato> {
  return comOrganizacao(organizacaoId, async (tx) => {
    const atual = await tx.contato.findUnique({ where: { id } });
    if (!atual) throw new NaoEncontrado("Contato");

    await recusarDocumentoDuplicado(tx, dados.documento, id);
    return tx.contato.update({
      where: { id },
      data: paraBanco(dados),
      select: CAMPOS,
    });
  });
}

/**
 * Remove o contato, mas só quando ele não deixou rastro financeiro.
 *
 * Apagar um contato que já aparece em lançamento ou movimento de custódia
 * quebraria a auditabilidade (§3.3) — nesse caso o caminho é inativar.
 */
export async function excluirContato(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const contato = await tx.contato.findUnique({
      where: { id },
      include: {
        _count: { select: { lancamentos: true, destinacoes: true, movimentos: true } },
      },
    });
    if (!contato) throw new NaoEncontrado("Contato");

    const { lancamentos, destinacoes, movimentos } = contato._count;
    if (lancamentos + destinacoes + movimentos > 0) {
      throw new ErroDeNegocio(
        "Este contato já tem movimentação financeira e não pode ser excluído. Inative-o.",
      );
    }

    await tx.contato.delete({ where: { id } });
  });
}

export async function alternarAtivoContato(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const contato = await tx.contato.findUnique({ where: { id } });
    if (!contato) throw new NaoEncontrado("Contato");
    return tx.contato.update({
      where: { id },
      data: { ativo: !contato.ativo },
      select: CAMPOS,
    });
  });
}

// --------------------------------------------------------------- auxiliares

type Tx = Parameters<Parameters<typeof comOrganizacao>[1]>[0];

async function recusarDocumentoDuplicado(tx: Tx, documento: string, exceto?: string) {
  const existente = await tx.contato.findFirst({
    where: { documento, ...(exceto ? { id: { not: exceto } } : {}) },
    select: { id: true, nome: true },
  });
  if (existente) {
    throw new ErroDeNegocio(
      `Já existe um contato com este documento: ${existente.nome}.`,
      "documento",
    );
  }
}

function paraBanco(dados: ContatoEntrada) {
  return {
    nome: dados.nome,
    tipoPessoa: dados.tipoPessoa,
    documento: dados.documento,
    papeis: dados.papeis,
    ativo: dados.ativo,
    telefone: dados.telefone ?? null,
    email: dados.email ?? null,
    cidade: dados.cidade ?? null,
    estado: dados.estado ?? null,
    banco: dados.banco ?? null,
    tipoConta: dados.tipoConta ?? null,
    agencia: dados.agencia ?? null,
    conta: dados.conta ?? null,
    tipoChavePix: dados.tipoChavePix ?? null,
    chavePix: dados.chavePix ?? null,
  };
}
