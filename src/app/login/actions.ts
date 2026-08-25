"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  apagarCookieDeSessao,
  gravarCookieDeSessao,
  tokenDaRequisicao,
} from "@/modules/auth/sessao";
import {
  autenticar,
  encerrarSessao,
  limparSessoesVencidas,
} from "@/modules/auth/servico";
import { falha, type Resultado } from "@/shared/erros";

const loginEsquema = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function entrarAction(form: FormData): Promise<Resultado> {
  try {
    const parsed = loginEsquema.safeParse({
      email: String(form.get("email") ?? ""),
      senha: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0].message };
    }

    const { token, expiraEm } = await autenticar(parsed.data.email, parsed.data.senha);
    await gravarCookieDeSessao(token, expiraEm);
    void limparSessoesVencidas();

    return { ok: true, dados: undefined };
  } catch (erro) {
    return falha(erro);
  }
}

export async function sairAction() {
  await encerrarSessao(await tokenDaRequisicao());
  await apagarCookieDeSessao();
  redirect("/login");
}
