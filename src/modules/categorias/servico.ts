import "server-only";

import { z } from "zod";

import { comOrganizacao } from "@/db/client";
import { ErroDeNegocio, NaoEncontrado } from "@/shared/erros";

export type TipoCategoria = "RECEITA" | "DESPESA";

/** A categoria como a tela consome: pai com as filhas embutidas. */
export type CategoriaArvore = {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  ativa: boolean;
  subcategorias: { id: string; nome: string; ativa: boolean }[];
};

export const categoriaEsquema = z.object({
  nome: z.string().trim().min(2, "Informe o nome da categoria."),
  tipo: z.enum(["RECEITA", "DESPESA"]),
  paiId: z.uuid().nullable().optional(),
});

export type CategoriaEntrada = z.infer<typeof categoriaEsquema>;

export async function listarCategorias(
  organizacaoId: string,
): Promise<CategoriaArvore[]> {
  const todas = await comOrganizacao(organizacaoId, (tx) =>
    tx.categoria.findMany({
      select: { id: true, nome: true, tipo: true, ativa: true, paiId: true },
      orderBy: { nome: "asc" },
    }),
  );

  const raizes = todas.filter((c) => c.paiId === null);
  return raizes.map((raiz) => ({
    id: raiz.id,
    nome: raiz.nome,
    tipo: raiz.tipo,
    ativa: raiz.ativa,
    subcategorias: todas
      .filter((c) => c.paiId === raiz.id)
      .map((c) => ({ id: c.id, nome: c.nome, ativa: c.ativa })),
  }));
}

/** Lista plana com o caminho completo — para o <select> dos lançamentos. */
export async function listarCategoriasPlanas(
  organizacaoId: string,
  tipo?: TipoCategoria,
) {
  const todas = await comOrganizacao(organizacaoId, (tx) =>
    tx.categoria.findMany({
      where: { ativa: true, ...(tipo ? { tipo } : {}) },
      select: { id: true, nome: true, tipo: true, paiId: true },
      orderBy: { nome: "asc" },
    }),
  );

  const porId = new Map(todas.map((c) => [c.id, c]));
  return todas
    .map((c) => {
      const pai = c.paiId ? porId.get(c.paiId) : undefined;
      return {
        id: c.id,
        tipo: c.tipo,
        nome: pai ? `${pai.nome} › ${c.nome}` : c.nome,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function criarCategoria(
  organizacaoId: string,
  dados: CategoriaEntrada,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    if (dados.paiId) {
      const pai = await tx.categoria.findUnique({ where: { id: dados.paiId } });
      if (!pai) throw new NaoEncontrado("Categoria pai");
      if (pai.paiId) {
        // Dois níveis bastam para o que as telas mostram; permitir mais
        // profundidade só criaria hierarquia que a interface não sabe exibir.
        throw new ErroDeNegocio("Subcategoria não pode ter subcategoria.");
      }
      if (pai.tipo !== dados.tipo) {
        throw new ErroDeNegocio(
          "A subcategoria precisa ser do mesmo tipo da categoria pai.",
        );
      }
    }

    const duplicada = await tx.categoria.findFirst({
      where: { nome: dados.nome, paiId: dados.paiId ?? null },
    });
    if (duplicada) {
      throw new ErroDeNegocio("Já existe uma categoria com esse nome.", "nome");
    }

    return tx.categoria.create({
      data: {
        organizacaoId,
        nome: dados.nome,
        tipo: dados.tipo,
        paiId: dados.paiId ?? null,
      },
      select: { id: true },
    });
  });
}

export async function renomearCategoria(
  organizacaoId: string,
  id: string,
  nome: string,
) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const atual = await tx.categoria.findUnique({ where: { id } });
    if (!atual) throw new NaoEncontrado("Categoria");
    return tx.categoria.update({
      where: { id },
      data: { nome },
      select: { id: true },
    });
  });
}

/**
 * Exclui a categoria. Recusa quando há lançamento classificado nela — apagar
 * levaria lançamento a ficar sem categoria, perdendo informação já registrada.
 */
export async function excluirCategoria(organizacaoId: string, id: string) {
  return comOrganizacao(organizacaoId, async (tx) => {
    const categoria = await tx.categoria.findUnique({
      where: { id },
      include: { _count: { select: { lancamentos: true, subcategorias: true } } },
    });
    if (!categoria) throw new NaoEncontrado("Categoria");

    if (categoria._count.lancamentos > 0) {
      throw new ErroDeNegocio(
        "Esta categoria já classifica lançamentos e não pode ser excluída.",
      );
    }

    // Uma subcategoria com lançamento também impede: o cascade do banco a
    // apagaria junto, levando o lançamento dela embora.
    if (categoria._count.subcategorias > 0) {
      const comUso = await tx.lancamento.count({
        where: { categoria: { paiId: id } },
      });
      if (comUso > 0) {
        throw new ErroDeNegocio(
          "Uma subcategoria desta categoria já classifica lançamentos. Exclua-as primeiro.",
        );
      }
    }

    await tx.categoria.delete({ where: { id } });
  });
}
