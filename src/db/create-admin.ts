import "dotenv/config";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash as argonHash } from "@node-rs/argon2";

import { PrismaClient } from "./generated/client";

// One-off bootstrap for the very first admin in an environment — there is
// no self-serve sign-up in this app (deliberately, per ARQUITETURA.md).
// Reads everything from environment variables so the password never has to
// be typed into a chat or a shell history that gets shared. Doesn't build
// its client from src/db/client.ts because that module imports
// "server-only", which throws outside of Next's bundler.
//
// Usage:
//   DATABASE_URL="..." \
//   ORG_NAME="..." ORG_DOCUMENT="..." \
//   ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." \
//   npm run db:create-admin

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. See the usage comment at the top of src/db/create-admin.ts.`);
  }
  return value;
}

async function main() {
  const orgName = requireEnv("ORG_NAME");
  const orgDocument = requireEnv("ORG_DOCUMENT");
  const adminName = requireEnv("ADMIN_NAME");
  const adminEmail = requireEnv("ADMIN_EMAIL").trim().toLowerCase();
  const adminPassword = requireEnv("ADMIN_PASSWORD");

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingUser) {
    throw new Error(`A user with e-mail ${adminEmail} already exists.`);
  }

  const organization = await prisma.organization.create({
    data: { name: orgName, document: orgDocument },
  });

  const user = await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: adminName,
      email: adminEmail,
      passwordHash: await argonHash(adminPassword),
      role: "ADMIN",
    },
  });

  console.log(`Organization "${organization.name}" (${organization.id}) created.`);
  console.log(`Admin user "${user.name}" <${user.email}> created — sign in at /login.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
