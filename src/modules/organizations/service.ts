import "server-only";

import { randomUUID } from "node:crypto";

import { prismaAdmin, withOrganization } from "@/db/client";
import { Prisma } from "@/db/generated/client";
import { createDefaultMarkers } from "@/modules/markers/service";
import { BusinessError } from "@/shared/errors";
import type { OrganizationInput } from "./schema";
import type { UserOrganization } from "./types";

/**
 * Creates an organization with `userId` as its first administrator (RN-33)
 * and the default marcadores (RN-36).
 *
 * The id is generated here, before the transaction, so the whole thing can
 * run under RLS like any other write: the transaction declares the new
 * organization as its own and both inserts satisfy WITH CHECK.
 */
export async function createOrganization(userId: string, input: OrganizationInput): Promise<UserOrganization> {
  const id = randomUUID();

  try {
    return await withOrganization(id, async (tx) => {
      const organization = await tx.organization.create({
        data: { id, name: input.name, document: input.document },
      });
      await tx.membership.create({ data: { organizationId: id, userId, role: "ADMIN" } });
      await createDefaultMarkers(tx, id);
      return { id, name: organization.name, document: organization.document, role: "ADMIN" as const };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new BusinessError("Já existe uma empresa cadastrada com este documento.", "document");
    }
    throw error;
  }
}

/**
 * Every organization the user belongs to — for the company switcher and the
 * post-login picker. Owner role: listing a person's companies inherently
 * crosses organizations, like the login lookup.
 */
export async function listUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const memberships = await prismaAdmin.membership.findMany({
    where: { userId },
    select: { role: true, organization: { select: { id: true, name: true, document: true } } },
    orderBy: { organization: { name: "asc" } },
  });

  return memberships.map(({ role, organization }) => ({ ...organization, role }));
}

/** The user's membership in one organization, or null when they aren't a member. */
export async function findMembership(userId: string, organizationId: string): Promise<UserOrganization | null> {
  return withOrganization(organizationId, async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      select: { role: true, organization: { select: { id: true, name: true, document: true } } },
    });
    return membership ? { ...membership.organization, role: membership.role } : null;
  });
}
