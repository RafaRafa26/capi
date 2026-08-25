import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ehBancoIndisponivel } from "@/db/indisponivel";
import { NaoAutenticado } from "@/shared/erros";
import {
  ACESSO_LIVRE,
  DIAS_DE_SESSAO,
  sessaoLivre,
  sessaoPorToken,
  type SessaoAtiva,
} from "./servico";

export const COOKIE_SESSAO = "capi_sessao";

export async function gravarCookieDeSessao(token: string, expiraEm: Date) {
  const jar = await cookies();
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiraEm,
    maxAge: DIAS_DE_SESSAO * 24 * 60 * 60,
  });
}

export async function apagarCookieDeSessao() {
  const jar = await cookies();
  jar.delete(COOKIE_SESSAO);
}

export async function tokenDaRequisicao() {
  const jar = await cookies();
  return jar.get(COOKIE_SESSAO)?.value;
}

/**
 * Sessão da requisição atual, ou null.
 *
 * `cache` do React deduplica dentro de um mesmo render: o layout, a página e
 * cada server action podem chamar à vontade que o banco é consultado uma vez só.
 */
export const sessaoAtual = cache(async (): Promise<SessaoAtiva | null> => {
  try {
    const porToken = await sessaoPorToken(await tokenDaRequisicao());
    if (porToken) return porToken;

    // Acesso livre (temporário): sem sessão, o app roda como o admin padrão
    // em vez de mandar para o login. Ver ACESSO_LIVRE em ./servico.ts.
    if (ACESSO_LIVRE) return await sessaoLivre();

    return null;
  } catch (erro) {
    // Sem banco utilizável (env ausente, servidor fora, credencial errada),
    // nenhuma rota funciona — toda página começa por aqui, então este é o
    // lugar de trocar o error boundary genérico por uma orientação clara.
    if (ehBancoIndisponivel(erro)) redirect("/configuracao-pendente");
    throw erro;
  }
});

/** Para páginas: manda para o login quando não há sessão. */
export async function exigirSessaoOuRedirecionar(): Promise<SessaoAtiva> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  return sessao;
}

/** Para server actions: lança, para o `catch` da borda transformar em mensagem. */
export async function exigirSessao(): Promise<SessaoAtiva> {
  const sessao = await sessaoAtual();
  if (!sessao) throw new NaoAutenticado();
  return sessao;
}
