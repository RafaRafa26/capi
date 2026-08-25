import "server-only";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client";

// Dois papéis de banco, deliberadamente (ver src/db/migrations/*_rls):
//
//   prismaAdmin  → papel dono. Ignora RLS. Usado SOMENTE por autenticação
//                  (procurar usuário por e-mail antes de saber a organização)
//                  e pelo seed.
//   comOrganizacao() → papel da aplicação, sujeito a RLS. Todo o resto passa
//                  por aqui, declarando explicitamente em que organização a
//                  transação está operando.
//
// Em desenvolvimento o Next recarrega os módulos a cada edição; sem o cache em
// globalThis, cada recarga abriria um pool novo até esgotar as conexões.

declare global {
  var __capiPools: { admin?: PrismaClient; app?: PrismaClient } | undefined;
}

const cache = (globalThis.__capiPools ??= {});

function criarCliente(url: string | undefined, nome: string): PrismaClient {
  if (!url) {
    throw new Error(
      `${nome} não está definida. Copie .env.example para .env e preencha as URLs do banco.`,
    );
  }
  const pool = new pg.Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prismaAdmin: PrismaClient = (cache.admin ??= criarCliente(
  process.env.DATABASE_URL,
  "DATABASE_URL",
));

const prismaApp: PrismaClient = (cache.app ??= criarCliente(
  process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL,
  "DATABASE_URL_APP",
));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cliente dentro de uma transação — o tipo que os repositórios recebem. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Executa `fn` numa transação declarando a organização ativa, de modo que o
 * RLS filtre tudo que ela tocar.
 *
 * `SET LOCAL` vale só até o fim da transação, então não há risco de vazar a
 * organização para a próxima consulta que pegar a mesma conexão do pool.
 */
export async function comOrganizacao<T>(
  organizacaoId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  // SET LOCAL não aceita parâmetro vinculado, então o valor entra interpolado
  // — daí a validação estrita de formato antes de chegar ao SQL.
  if (!UUID.test(organizacaoId)) {
    throw new Error("Identificador de organização inválido.");
  }

  return prismaApp.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.organizacao_id = '${organizacaoId}'`,
    );
    return fn(tx);
  });
}
