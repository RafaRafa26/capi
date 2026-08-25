import "server-only";

import { z } from "zod";

import { comOrganizacao } from "@/db/client";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";

export type CentroCusto = { id: string; nome: string; ativo: boolean };

export const centroCustoEsquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do centro de custo."),
});

export async function listarCentrosDeCusto(
  organizacaoId: string,
): Promise<CentroCusto[]> {
  return comOrganizacao(organizacaoId, (tx) =>
    tx.centroCusto.findMany({
      select: { id: true, nome: true, ativo: true },
      orderBy: { nome: "asc" },
    }),
  );
}

export async function criarCentroCusto(organizacaoId: string, nome: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const duplicado = await tx.centroCusto.findFirst({ where: { nome } });
    if (duplicado) {
      throw new ErroDeNegocio("Já existe um centro de custo com esse nome.", "nome");
    }
    return tx.centroCusto.create({
      data: { organizacaoId, nome },
      select: { id: true, nome: true, ativo: true },
    });
  });
}

export async function alternarAtivoCentroCusto(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const centro = await tx.centroCusto.findUnique({ where: { id } });
    if (!centro) throw new NaoEncontrado("Centro de custo");
    return tx.centroCusto.update({
      where: { id },
      data: { ativo: !centro.ativo },
      select: { id: true, nome: true, ativo: true },
    });
  });
}

export async function excluirCentroCusto(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const centro = await tx.centroCusto.findUnique({
      where: { id },
      include: { _count: { select: { lancamentos: true } } },
    });
    if (!centro) throw new NaoEncontrado("Centro de custo");

    if (centro._count.lancamentos > 0) {
      throw new ErroDeNegocio(
        "Este centro de custo já tem lançamentos e não pode ser excluído. Inative-o.",
      );
    }

    await tx.centroCusto.delete({ where: { id } });
  });
}
