import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin } from "@/db/client";
import { removeTestOrganizations, removeTestUsers } from "@/db/__tests__/environment";
import { BusinessError } from "@/shared/errors";
import { organizationInputSchema } from "./schema";
import { createOrganization, findMembership, listUserOrganizations } from "./service";

// A valid CNPJ that differs per call and per run, so reruns never collide on
// the unique document.
let sequence = 0;
function freshCnpj(): string {
  sequence += 1;
  const base = String((Date.now() * 10 + sequence) % 1e8).padStart(8, "0") + "0001";
  const digit = (digits: string, weights: number[]) => {
    const rest = weights.reduce((acc, w, i) => acc + Number(digits[i]) * w, 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${first}${second}`;
}

let userId: string;
let otherUserId: string;
const created: string[] = [];

beforeAll(async () => {
  const suffix = Date.now();
  userId = (await prismaAdmin.user.create({
    data: { name: "Owner", email: `org-owner-${suffix}@example.test`, passwordHash: "unused" },
  })).id;
  otherUserId = (await prismaAdmin.user.create({
    data: { name: "Other", email: `org-other-${suffix}@example.test`, passwordHash: "unused" },
  })).id;
});

afterAll(async () => {
  await removeTestOrganizations(created);
  await removeTestUsers();
});

describe("organizations", () => {
  it("normalizes and validates the document", () => {
    expect(organizationInputSchema.parse({ name: "X", document: "11.222.333/0001-81" }).document).toBe(
      "11222333000181",
    );
    expect(organizationInputSchema.safeParse({ name: "X", document: "11.222.333/0001-80" }).success).toBe(false);
    expect(organizationInputSchema.safeParse({ name: "X", document: "" }).success).toBe(false);
  });

  it("creates an organization with the creator as its administrator", async () => {
    const organization = await createOrganization(userId, { name: "Fazenda A", document: freshCnpj() });
    created.push(organization.id);

    expect(organization.role).toBe("ADMIN");
    expect(await findMembership(userId, organization.id)).toMatchObject({ id: organization.id, role: "ADMIN" });
    expect(await findMembership(otherUserId, organization.id)).toBeNull();
  });

  it("refuses a second organization with the same document", async () => {
    const document = freshCnpj();
    const first = await createOrganization(userId, { name: "Primeira", document });
    created.push(first.id);

    await expect(createOrganization(otherUserId, { name: "Segunda", document })).rejects.toThrow(BusinessError);
  });

  it("lists every organization the user belongs to", async () => {
    const ids = (await listUserOrganizations(userId)).map((o) => o.id);
    expect(ids).toEqual(expect.arrayContaining(created));
    expect(await listUserOrganizations(otherUserId)).toEqual([]);
  });
});
