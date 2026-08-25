"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import {
  categoriaEsquema,
  criarCategoria,
  excluirCategoria,
  renomearCategoria,
} from "@/modules/categorias/servico";
import { falha, type Resultado } from "@/shared/erros";

export async function criarCategoriaAction(entrada: {
  nome: string;
  tipo: string;
  paiId?: string | null;
}): Promise<Resultado<{ id: string }>> {
  try {
    const sessao = await exigirSessao();
    const parsed = categoriaEsquema.safeParse(entrada);
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0].message };
    }

    const criada = await criarCategoria(sessao.organizacaoId, parsed.data);
    revalidatePath("/categorias");
    return { ok: true, dados: { id: criada.id } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function renomearCategoriaAction(
  id: string,
  nome: string,
): Promise<Resultado> {
  try {
    const sessao = await exigirSessao();
    if (nome.trim().length < 2) {
      return { ok: false, erro: "Informe o nome da categoria." };
    }
    await renomearCategoria(sessao.organizacaoId, id, nome.trim());
    revalidatePath("/categorias");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirCategoriaAction(id: string): Promise<Resultado> {
  try {
    const sessao = await exigirSessao();
    await excluirCategoria(sessao.organizacaoId, id);
    revalidatePath("/categorias");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
