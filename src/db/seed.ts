import "dotenv/config";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash as argonHash } from "@node-rs/argon2";

import { PrismaClient } from "./generated/client";

// Development seed. Runs under the database owner role, bypassing RLS on
// purpose — it doesn't build its client from src/db/client.ts because that
// module imports "server-only", which throws outside of Next's bundler
// (this script runs directly under tsx/node).

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const existing = await prisma.organization.findFirst({
    where: { document: "12.345.678/0001-90" },
  });
  if (existing) {
    console.log("Seed already applied — demo organization exists.");
    return;
  }

  const organization = await prisma.organization.create({
    data: { name: "Capi Demo", document: "12.345.678/0001-90" },
  });

  await prisma.user.create({
    data: {
      organizationId: organization.id,
      name: "Admin Demo",
      email: "admin@capi.test",
      passwordHash: await argonHash("capi1234"),
      role: "ADMIN",
    },
  });

  await prisma.contact.createMany({
    data: [
      {
        organizationId: organization.id,
        name: "Fazenda Santa Rita",
        legalName: "Fazenda Santa Rita Agropecuária Ltda",
        document: "12.345.678/0001-90",
        personType: "COMPANY",
        contactType: "BENEFICIARY",
        bankDetails: {
          pixKey: "12.345.678/0001-90",
          bank: "001 - Banco do Brasil",
          branchNumber: "1234",
          accountNumber: "56789-0",
          accountType: "Conta Corrente",
          accountHolder: "Fazenda Santa Rita Agropecuária Ltda",
        },
      },
      {
        organizationId: organization.id,
        name: "Paulo Roberto da Silva",
        document: "123.456.789-00",
        personType: "INDIVIDUAL",
        contactType: "CLIENT",
      },
    ],
  });

  console.log("Seed applied: admin@capi.test / capi1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
