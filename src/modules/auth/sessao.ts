import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { ehBancoIndisponivel } from "@/db/indisponivel";
import { ORGANIZACAO_DEMO, USUARIO_DEMO } from "@/modules/demo/dados";
import { NaoAutenticado } from "@/shared/erros";
import {
  ACESSO_LIVRE,
  DIAS_DE_SESSAO,
  sessaoLivre,
  sessaoPorToken,
  type SessaoAtiva,
} from "./servico";

export const COOKIE_SESSAO = "capi_sessao";

/** Sessão fictícia do modo demonstração — nada disso vem do banco. */
const SESSAO_DEMO: SessaoAtiva = {
  usuarioId: USUARIO_DEMO.id,
  organizacaoId: ORGANIZACAO_DEMO.id,
  nome: USUARIO_DEMO.nome,
  email: USUARIO_DEMO.email,
  papel: "ADMIN",
  organizacaoNome: ORGANIZACAO_DEMO.nome,
  organizacaoDocumento: ORGANIZACAO_DEMO.documento,
};

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
    // Sem banco utilizável, o app entra em MODO DEMONSTRAÇÃO: as telas caem
    // para dados de exemplo (ver modules/demo/) em vez de quebrar. A sessão
    // aqui é fictícia, só para o sidebar ter nome e organização.
    if (ehBancoIndisponivel(erro)) return SESSAO_DEMO;
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
