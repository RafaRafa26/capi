import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin, withOrganization } from "@/db/client";
import { listContacts } from "@/modules/contacts/service";
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
