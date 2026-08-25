import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

import { prismaAdmin } from "@/db/client";
import { ErroDeNegocio } from "@/shared/erros";

// Sessão opaca em banco, não JWT: revogar é `DELETE`, e o cookie sozinho não
// carrega nenhuma afirmação sobre quem o portador é.
export const DIAS_DE_SESSAO = 30;

/**
 * O token vai em claro no cookie e só o hash fica no banco — quem ler um dump
 * do banco não consegue montar um cookie válido a partir dele.
 *
 * SHA-256 sem salt é adequado aqui (ao contrário de senha): o token tem 256
 * bits de entropia aleatória, então não há espaço de busca para atacar.
 */
function hashDoToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashDeSenha(senha: string) {
  return argonHash(senha);
}

async function senhaConfere(hash: string, senha: string) {
  try {
    return await argonVerify(hash, senha);
  } catch {
    return false;
  }
}

export type SessaoAtiva = {
  usuarioId: string;
  organizacaoId: string;
  nome: string;
  email: string;
  papel: "ADMIN" | "OPERADOR";
  organizacaoNome: string;
  organizacaoDocumento: string;
};

/**
 * Confere e-mail e senha e abre uma sessão. Retorna o token que deve ir para o
 * cookie.
 *
 * Roda no papel dono do banco porque procurar um usuário por e-mail precisa,
 * por natureza, atravessar organizações — é o único ponto do sistema com essa
 * característica.
 */
export async function autenticar(
  email: string,
  senha: string,
): Promise<{ token: string; expiraEm: Date }> {
  const usuario = await prismaAdmin.usuario.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Mesmo com usuário inexistente, gastamos o tempo de uma verificação de
  // senha, para que "e-mail não existe" e "senha errada" não se distingam pelo
  // tempo de resposta.
  const hashParaConferir =
    usuario?.senhaHash ??
    "$argon2id$v=19$m=19456,t=2,p=1$c2FsdG9EZUNvbXBhcmFjYW8$0000000000000000000000000000000000000000000";
  const confere = await senhaConfere(hashParaConferir, senha);

  if (!usuario || !usuario.ativo || !confere) {
    throw new ErroDeNegocio("E-mail ou senha inválidos.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + DIAS_DE_SESSAO * 24 * 60 * 60 * 1000);

  await prismaAdmin.sessao.create({
    data: { usuarioId: usuario.id, tokenHash: hashDoToken(token), expiraEm },
  });

  return { token, expiraEm };
}

/** Resolve o token do cookie numa sessão ativa, ou null. */
export async function sessaoPorToken(
  token: string | undefined,
): Promise<SessaoAtiva | null> {
  if (!token) return null;

  const registro = await prismaAdmin.sessao.findUnique({
    where: { tokenHash: hashDoToken(token) },
    include: { usuario: { include: { organizacao: true } } },
  });

  if (!registro) return null;

  if (registro.expiraEm.getTime() < Date.now()) {
    await prismaAdmin.sessao.delete({ where: { id: registro.id } }).catch(() => {});
    return null;
  }

  const { usuario } = registro;
  if (!usuario.ativo) return null;

  return {
    usuarioId: usuario.id,
    organizacaoId: usuario.organizacaoId,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
    organizacaoNome: usuario.organizacao.nome,
    organizacaoDocumento: usuario.organizacao.documento,
  };
}

export async function encerrarSessao(token: string | undefined) {
  if (!token) return;
  await prismaAdmin.sessao
    .deleteMany({ where: { tokenHash: hashDoToken(token) } })
    .catch(() => {});
}

/** Remove sessões vencidas. Chamado no login para não acumular lixo. */
export async function limparSessoesVencidas() {
  await prismaAdmin.sessao
    .deleteMany({ where: { expiraEm: { lt: new Date() } } })
    .catch(() => {});
}

/** Comparação em tempo constante, para uso em conferências de token. */
export function comparaSeguro(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
