import type { PrismaClient } from "./generated/client";

/**
 * Deletes an entire organization, in dependency order.
 *
 * `users` and `contacts` reference the organization with `Restrict` on
 * purpose — nobody should be able to delete an organization by accident
 * through a cascading foreign key. Sessions cascade from their user.
 *
 * Used by tests that create and destroy disposable organizations.
 */
export async function removeOrganization(prisma: PrismaClient, id: string) {
  await prisma.contact.deleteMany({ where: { organizationId: id } });
  await prisma.user.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });
}
