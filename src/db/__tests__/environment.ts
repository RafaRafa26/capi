import "dotenv/config";

import { prismaAdmin } from "@/db/client";
import { removeOrganization } from "@/db/remove-organization";

// Support for tests that touch the real database.
//
// They run against the development Postgres, in a pair of disposable
// organizations created and destroyed per test file. Testing isolation
// against a real database (not a mock) is what gives confidence that RLS is
// actually doing its job — exactly what ARQUITETURA.md §9 lists as the top
// risk.

export type TestOrg = {
  id: string;
  userId: string;
  contactId: string;
};

let counter = 0;

export async function createTestOrganization(label: string): Promise<TestOrg> {
  counter += 1;
  const suffix = `${Date.now()}-${counter}`;

  const organization = await prismaAdmin.organization.create({
    data: { name: `Test ${label}`, document: `test-doc-${suffix}` },
  });

  const user = await prismaAdmin.user.create({
    data: {
      organizationId: organization.id,
      name: "Test User",
      email: `test-${suffix}@example.test`,
      passwordHash: "unused",
    },
  });

  const contact = await prismaAdmin.contact.create({
    data: {
      organizationId: organization.id,
      name: "Test Contact",
      document: `contact-${suffix}`,
      personType: "INDIVIDUAL",
    },
  });

  return { id: organization.id, userId: user.id, contactId: contact.id };
}

export async function removeTestOrganizations(ids: string[]) {
  for (const id of ids) {
    // No silent catch here — swallowing the failure would let test
    // organizations pile up in the dev database unnoticed.
    await removeOrganization(prismaAdmin, id);
  }
}
