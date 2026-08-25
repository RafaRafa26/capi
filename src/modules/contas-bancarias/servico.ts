import "server-only";

import { z } from "zod";

import { comOrganizacao } from "@/db/client";
import { paraCentavos } from "@/shared/dinheiro";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";
import type { ContaBancaria, NaturezaConta } from "./tipos";

export const contaBancariaEsquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da conta."),
  banco: z.string().trim().min(1, "Informe o banco."),
  agencia: z.string().trim().min(1, "Informe a agência."),
  conta: z.string().trim().min(1, "Informe a conta."),
  natureza: z.enum(["PROPRIA", "TERCEIRO"]),
  // Chega como texto do formulário ("9.854,00") e sai em centavos inteiros.
  saldoInicial: z.string().transform((v) => paraCentavos(v)),
  dataSaldoInicial: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable(),
});

export type ContaBancariaEntrada = z.infer<typeof contaBancariaEsquema>;

const CAMPOS = {
  id: true,
  nome: true,
  banco: true,
  agencia: true,
  conta: true,
  natureza: true,
  saldoInicial: true,
  dataSaldoInicial: true,
  ativa: true,
} as const;

type LinhaBanco = {
  id: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  natureza: NaturezaConta;
  saldoInicial: number;
  dataSaldoInicial: Date | null;
  ativa: boolean;
};

// `Date` vira string ISO curta antes de cruzar para o cliente.
function paraTela(linha: LinhaBanco): ContaBancaria {
  return {
    ...linha,
    dataSaldoInicial: linha.dataSaldoInicial
      ? linha.dataSaldoInicial.toISOString().slice(0, 10)
      : null,
  };
}

export async function listarContasBancarias(
  organizacaoId: string,
): Promise<ContaBancaria[]> {
  const linhas = await comOrganizacao(organizacaoId, (tx) =>
    tx.contaBancaria.findMany({ select: CAMPOS, orderBy: { nome: "asc" } }),
  );
  return linhas.map(paraTela);
}

/** Só contas próprias: são as que têm extrato e liquidam por conciliação. */
export async function listarContasProprias(organizacaoId: string) {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.contaBancaria.findMany({
      where: { natureza: "PROPRIA", ativa: true },
      select: { id: true, nome: true, banco: true },
      orderBy: { nome: "asc" },
    }),
  );
}

export async function buscarContaBancaria(
  organizacaoId: string,
  id: string,
): Promise<ContaBancaria | null> {
  const linha = await comOrganizacao(organizacaoId, (tx) =>
    tx.contaBancaria.findUnique({ where: { id }, select: CAMPOS }),
  );
  return linha ? paraTela(linha) : null;
}

export async function criarContaBancaria(
  organizacaoId: string,
  dados: ContaBancariaEntrada,
) {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.contaBancaria.create({
      data: { organizacaoId, ...paraBanco(dados) },
      select: CAMPOS,
    }),
  );
}

export async function atualizarContaBancaria(
  organizacaoId: string,
  id: string,
  dados: ContaBancariaEntrada,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const atual = await tx.contaBancaria.findUnique({
      where: { id },
      include: { _count: { select: { transacoes: true } } },
    });
    if (!atual) throw new NaoEncontrado("Conta bancária");

    // Trocar a natureza depois que o extrato entrou reclassificaria todo o
    // histórico de custódia de uma vez (RN-01, RN-21).
    if (atual.natureza !== dados.natureza && atual._count.transacoes > 0) {
      throw new ErroDeNegocio(
        "Esta conta já tem transações importadas; a natureza não pode mais ser alterada.",
        "natureza",
      );
    }

    return tx.contaBancaria.update({
      where: { id },
      data: paraBanco(dados),
      select: CAMPOS,
    });
  });
}

export async function alternarAtivaContaBancaria(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const conta = await tx.contaBancaria.findUnique({ where: { id } });
    if (!conta) throw new NaoEncontrado("Conta bancária");
    return tx.contaBancaria.update({
      where: { id },
      data: { ativa: !conta.ativa },
      select: CAMPOS,
    });
  });
}

export async function excluirContaBancaria(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const conta = await tx.contaBancaria.findUnique({
      where: { id },
      include: {
        _count: { select: { transacoes: true, lancamentos: true, liquidacoes: true } },
      },
    });
    if (!conta) throw new NaoEncontrado("Conta bancária");

    const { transacoes, lancamentos, liquidacoes } = conta._count;
    if (transacoes + lancamentos + liquidacoes > 0) {
      throw new ErroDeNegocio(
        "Esta conta já tem movimentação e não pode ser excluída. Inative-a.",
      );
    }

    await tx.contaBancaria.delete({ where: { id } });
  });
}

function paraBanco(dados: ContaBancariaEntrada) {
  return {
    nome: dados.nome,
    banco: dados.banco,
    agencia: dados.agencia,
    conta: dados.conta,
    natureza: dados.natureza,
    saldoInicial: dados.saldoInicial,
    dataSaldoInicial: dados.dataSaldoInicial
      ? new Date(`${dados.dataSaldoInicial}T00:00:00Z`)
      : null,
  };
}
