"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import { recusarEscritaNoDemo } from "@/modules/demo/modo";
import {
  contatoDoFormulario,
  contatoEsquema,
  primeiroErro,
} from "@/modules/contatos/esquema";
import {
  alternarAtivoContato,
  atualizarContato,
  criarContato,
  excluirContato,
} from "@/modules/contatos/servico";
import { falha, type Resultado } from "@/shared/erros";

// Borda: valida o formato, chama o serviço, traduz erro. Nenhuma regra de
// negócio aqui (ARQUITETURA §8.2).

export async function salvarContatoAction(
  id: string | null,
  form: FormData,
): Promise<Resultado<{ id: string }>> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();

    const parsed = contatoEsquema.safeParse(contatoDoFormulario(form));
    if (!parsed.success) {
      const { mensagem, campo } = primeiroErro(parsed.error);
      return { ok: false, erro: mensagem, campo };
    }

    const contato = id
      ? await atualizarContato(sessao.organizacaoId, id, parsed.data)
      : await criarContato(sessao.organizacaoId, parsed.data);

    revalidatePath("/contatos");
    revalidatePath(`/contatos/${contato.id}`);
    return { ok: true, dados: { id: contato.id } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirContatoAction(id: string): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await excluirContato(sessao.organizacaoId, id);
    revalidatePath("/contatos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function alternarAtivoContatoAction(id: string): Promise<Resultado> {
  try {
    await recusarEscritaNoDemo();
    const sessao = await exigirSessao();
    await alternarAtivoContato(sessao.organizacaoId, id);
    revalidatePath("/contatos");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
