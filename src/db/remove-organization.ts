import type { PrismaClient } from "./generated/client";

/**
 * Deletes an entire organization, in dependency order.
 *
 * Every table here references the organization with `Restrict` on purpose —
 * nobody should be able to delete an organization by accident through a
 * cascading foreign key. Users are global (they may belong to other
 * organizations), so only their membership here goes away.
 *
 * Used by tests that create and destroy disposable organizations.
 */
export async function removeOrganization(prisma: PrismaClient, id: string) {
  await prisma.settlement.deleteMany({ where: { organizationId: id } });
  await prisma.allocation.deleteMany({ where: { organizationId: id } });
  await prisma.payout.deleteMany({ where: { organizationId: id } });
  await prisma.entry.deleteMany({ where: { organizationId: id } });
  await prisma.marker.deleteMany({ where: { organizationId: id } });
  await prisma.sale.deleteMany({ where: { organizationId: id } });
  await prisma.bankTransaction.deleteMany({ where: { organizationId: id } });
  await prisma.import.deleteMany({ where: { organizationId: id } });
  await prisma.contact.deleteMany({ where: { organizationId: id } });
  await prisma.bankAccount.deleteMany({ where: { organizationId: id } });
  await prisma.category.deleteMany({ where: { organizationId: id } });
  await prisma.invitation.deleteMany({ where: { organizationId: id } });
  await prisma.membership.deleteMany({ where: { organizationId: id } });
  await prisma.organization.delete({ where: { id } });
}
