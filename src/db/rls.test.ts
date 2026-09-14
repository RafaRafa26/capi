import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin, withOrganization } from "@/db/client";
import { listContacts } from "@/modules/contacts/service";
import { deleteBankTransaction } from "@/modules/statements/service";
import { NotFound } from "@/shared/errors";
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "./__tests__/environment";

let orgA: TestOrg;
let orgB: TestOrg;

beforeAll(async () => {
  orgA = await createTestOrganization("A");
  orgB = await createTestOrganization("B");
});

afterAll(async () => {
  await removeTestOrganizations([orgA.id, orgB.id]);
});

describe("row level security (AD-02)", () => {
  it("the application connects as the capi_app role, not the owner", async () => {
    const [{ current_user: currentUser }] = await withOrganization(
      orgA.id,
      (tx) => tx.$queryRawUnsafe<{ current_user: string }[]>("SELECT current_user"),
    );
    expect(currentUser).toBe("capi_app");
  });

  it("one organization does not see the other's contacts", async () => {
    const fromA = await listContacts(orgA.id);
    const fromB = await listContacts(orgB.id);

    expect(fromA.map((c) => c.id)).toContain(orgA.contactId);
    expect(fromB.map((c) => c.id)).toContain(orgB.contactId);

    const idsFromA = new Set(fromA.map((c) => c.id));
    expect(idsFromA.has(orgB.contactId)).toBe(false);
  });

  it("looking up the other organization's contact by id returns nothing", async () => {
    const result = await withOrganization(orgA.id, (tx) =>
      tx.contact.findUnique({ where: { id: orgB.contactId } }),
    );
    expect(result).toBeNull();
  });

  it("inserting a row declaring another organization's id is rejected by WITH CHECK", async () => {
    await expect(
      withOrganization(orgA.id, (tx) =>
        tx.contact.create({
          data: {
            organizationId: orgB.id,
            name: "Should not be allowed",
            document: `leak-${Date.now()}`,
            personType: "INDIVIDUAL",
            contactType: "CLIENT",
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it("the owner role bypasses RLS (used only for auth lookups and seed)", async () => {
    const all = await prismaAdmin.contact.findMany({
      where: { id: { in: [orgA.contactId, orgB.contactId] } },
    });
    expect(all).toHaveLength(2);
  });
});

describe("row level security — bank accounts and categories (AD-02)", () => {
  it("one organization does not see the other's bank accounts", async () => {
    const fromA = await withOrganization(orgA.id, (tx) => tx.bankAccount.findMany({}));
    const idsFromA = new Set(fromA.map((a) => a.id));

    expect(idsFromA.has(orgA.bankAccountId)).toBe(true);
    expect(idsFromA.has(orgB.bankAccountId)).toBe(false);
  });

  it("one organization does not see the other's categories", async () => {
    const fromA = await withOrganization(orgA.id, (tx) => tx.category.findMany({}));
    const idsFromA = new Set(fromA.map((c) => c.id));

    expect(idsFromA.has(orgA.categoryId)).toBe(true);
    expect(idsFromA.has(orgB.categoryId)).toBe(false);
  });
});

describe("row level security — imports and bank transactions (AD-02)", () => {
  let importA: { id: string };
  let importB: { id: string };
  let bankTransactionA: { id: string };
  let bankTransactionB: { id: string };

  beforeAll(async () => {
    importA = await prismaAdmin.import.create({
      data: { organizationId: orgA.id, bankAccountId: orgA.bankAccountId, fileName: "a.ofx" },
    });
    importB = await prismaAdmin.import.create({
      data: { organizationId: orgB.id, bankAccountId: orgB.bankAccountId, fileName: "b.ofx" },
    });
    const suffix = Date.now();
    bankTransactionA = await prismaAdmin.bankTransaction.create({
      data: {
        organizationId: orgA.id,
        bankAccountId: orgA.bankAccountId,
        importId: importA.id,
        bankReference: `rls-a-${suffix}`,
        date: new Date(),
        amount: 100,
        description: "Test transaction A",
      },
    });
    bankTransactionB = await prismaAdmin.bankTransaction.create({
      data: {
        organizationId: orgB.id,
        bankAccountId: orgB.bankAccountId,
        importId: importB.id,
        bankReference: `rls-b-${suffix}`,
        date: new Date(),
        amount: 100,
        description: "Test transaction B",
      },
    });
  });

  it("one organization does not see the other's imports", async () => {
    const fromA = await withOrganization(orgA.id, (tx) => tx.import.findMany({}));
    const idsFromA = new Set(fromA.map((i) => i.id));

    expect(idsFromA.has(importA.id)).toBe(true);
    expect(idsFromA.has(importB.id)).toBe(false);
  });

  it("one organization does not see the other's bank transactions", async () => {
    const fromA = await withOrganization(orgA.id, (tx) => tx.bankTransaction.findMany({}));
    const idsFromA = new Set(fromA.map((t) => t.id));

    expect(idsFromA.has(bankTransactionA.id)).toBe(true);
    expect(idsFromA.has(bankTransactionB.id)).toBe(false);
  });

  it("one organization cannot delete the other's bank transaction", async () => {
    await expect(deleteBankTransaction(orgA.id, bankTransactionB.id)).rejects.toThrow(NotFound);

    const stillThere = await prismaAdmin.bankTransaction.findUnique({
      where: { id: bankTransactionB.id },
    });
    expect(stillThere).not.toBeNull();
  });
});
