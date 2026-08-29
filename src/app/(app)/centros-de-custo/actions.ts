"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import { recusarEscritaNoDemo } from "@/modules/demo/modo";
import {
  alternarAtivoCentroCusto,
  centroCustoEsquema,
  criarCentroCusto,
  excluirCentroCusto,
} from "@/modules/centros-de-custo/servico";
import { falha, type Resultado } from "@/shared/erros";

export async function criarCentroCustoAction(
  nome: string,
): Promise<Resultado<{ id: string }>> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    const parsed = centroCustoEsquema.safeParse({ nome });
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0].message };
    }

    const criado = await criarCentroCusto(sessao.organizacaoId, parsed.data.nome);
    revalidatePath("/centros-de-custo");
    return { ok: true, dados: { id: criado.id } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function alternarAtivoCentroCustoAction(
  id: string,
): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await alternarAtivoCentroCusto(sessao.organizacaoId, id);
    revalidatePath("/centros-de-custo");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirCentroCustoAction(id: string): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await excluirCentroCusto(sessao.organizacaoId, id);
    revalidatePath("/centros-de-custo");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
