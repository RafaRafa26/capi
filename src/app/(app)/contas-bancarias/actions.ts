"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/modules/auth/sessao";
import {
  alternarAtivaContaBancaria,
  atualizarContaBancaria,
  contaBancariaEsquema,
  criarContaBancaria,
  excluirContaBancaria,
} from "@/modules/contas-bancarias/servico";
import { falha, type Resultado } from "@/shared/erros";

export async function salvarContaBancariaAction(
  id: string | null,
  form: FormData,
): Promise<Resultado<{ id: string }>> {
  try {
    const sessao = await exigirSessao();

    const parsed = contaBancariaEsquema.safeParse({
      nome: String(form.get("nome") ?? ""),
      banco: String(form.get("banco") ?? ""),
      agencia: String(form.get("agencia") ?? ""),
      conta: String(form.get("conta") ?? ""),
      natureza: String(form.get("natureza") ?? "PROPRIA"),
      saldoInicial: String(form.get("saldoInicial") ?? "0"),
      dataSaldoInicial: String(form.get("dataSaldoInicial") ?? ""),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, erro: issue.message, campo: String(issue.path[0] ?? "") };
    }

    const conta = id
      ? await atualizarContaBancaria(sessao.organizacaoId, id, parsed.data)
      : await criarContaBancaria(sessao.organizacaoId, parsed.data);

    revalidatePath("/contas-bancarias");
    return { ok: true, dados: { id: conta.id } };
  } catch (erro) {
    return falha(erro);
  }
}

export async function alternarAtivaContaBancariaAction(
  id: string,
): Promise<Resultado> {
  try {
    const sessao = await exigirSessao();
    await alternarAtivaContaBancaria(sessao.organizacaoId, id);
    revalidatePath("/contas-bancarias");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirContaBancariaAction(id: string): Promise<Resultado> {
  try {
    const sessao = await exigirSessao();
    await excluirContaBancaria(sessao.organizacaoId, id);
    revalidatePath("/contas-bancarias");
    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}
