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

/**
 * Cliente preguiçoso: o pool só nasce no primeiro uso de verdade.
 *
 * Isso não é otimização, é requisito de build. O `next build` importa os
 * módulos de cada rota para coletar configuração, e criar o cliente no escopo
 * do módulo faria o build inteiro falhar em qualquer ambiente sem
 * `DATABASE_URL` — mesmo sem nenhuma consulta acontecer. Adiando para o
 * primeiro acesso, o build passa e a variável ausente vira erro em tempo de
 * requisição, que é onde ela realmente importa.
 */
function clientePreguicoso(
  chave: "admin" | "app",
  lerUrl: () => string | undefined,
  nome: string,
): PrismaClient {
  const obter = () => (cache[chave] ??= criarCliente(lerUrl(), nome));

  return new Proxy({} as PrismaClient, {
    get(_alvo, prop) {
      const cliente = obter();
      const valor = Reflect.get(cliente, prop) as unknown;
      // Métodos como `$transaction` precisam do cliente real como `this`.
      return typeof valor === "function" ? valor.bind(cliente) : valor;
    },
    has(_alvo, prop) {
      return prop in obter();
    },
  });
}

export const prismaAdmin: PrismaClient = clientePreguicoso(
  "admin",
  () => process.env.DATABASE_URL,
  "DATABASE_URL",
);

const prismaApp: PrismaClient = clientePreguicoso(
  "app",
  () => process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL,
  "DATABASE_URL_APP",
);

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
