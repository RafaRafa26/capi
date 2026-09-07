import "server-only";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client";

// Two database roles, deliberately (see src/db/migrations/*_rls):
//
//   prismaAdmin      → owner role. Bypasses RLS. Used ONLY by authentication
//                       (looking up a user by e-mail before knowing their
//                       organization) and by the seed.
//   withOrganization() → application role, subject to RLS. Everything else
//                       goes through here, explicitly declaring which
//                       organization the transaction is operating in.
//
// In development Next reloads modules on every edit; without the cache on
// globalThis, each reload would open a new pool until connections run out.

declare global {
  var __capiPools: { admin?: PrismaClient; app?: PrismaClient } | undefined;
}

const cache = (globalThis.__capiPools ??= {});

function createClient(url: string | undefined, name: string): PrismaClient {
  if (!url) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill in the database URLs.`);
  }
  const pool = new pg.Pool({ connectionString: url });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

/**
 * Lazy client: the pool is only created on first real use.
 *
 * This isn't an optimization, it's a build requirement. `next build` imports
 * every route's modules to collect configuration, so creating the client at
 * module scope would fail the entire build in any environment without
 * `DATABASE_URL` — even with no query ever running. Deferring to first
 * access lets the build pass, and the missing variable becomes a
 * request-time error, which is where it actually matters.
 */
function lazyClient(
  key: "admin" | "app",
  readUrl: () => string | undefined,
  name: string,
): PrismaClient {
  const get = () => (cache[key] ??= createClient(readUrl(), name));

  return new Proxy({} as PrismaClient, {
    get(_target, prop) {
      const client = get();
      const value = Reflect.get(client, prop) as unknown;
      // Methods like `$transaction` need the real client as `this`.
      return typeof value === "function" ? value.bind(client) : value;
    },
    has(_target, prop) {
      return prop in get();
    },
  });
}

export const prismaAdmin: PrismaClient = lazyClient(
  "admin",
  () => process.env.DATABASE_URL,
  "DATABASE_URL",
);

const prismaApp: PrismaClient = lazyClient(
  "app",
  () => process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL,
  "DATABASE_URL_APP",
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Client inside a transaction — the type repositories/services receive. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Runs `fn` inside a transaction that declares the active organization, so
 * RLS filters everything it touches.
 *
 * `SET LOCAL` only holds until the transaction ends, so there's no risk of
 * leaking the organization to the next query that picks up the same pooled
 * connection.
 */
export async function withOrganization<T>(
  organizationId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  // SET LOCAL doesn't accept a bound parameter, so the value is interpolated
  // — hence the strict format check before it reaches the SQL.
  if (!UUID.test(organizationId)) {
    throw new Error("Invalid organization identifier.");
  }

  return prismaApp.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.organization_id = '${organizationId}'`);
    return fn(tx);
  });
}
