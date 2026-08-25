import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { NaoAutenticado } from "@/shared/erros";
import { DIAS_DE_SESSAO, sessaoPorToken, type SessaoAtiva } from "./servico";

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
  return sessaoPorToken(await tokenDaRequisicao());
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
