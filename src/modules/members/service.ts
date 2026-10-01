import "server-only";

import { prismaAdmin, withOrganization, type Tx } from "@/db/client";
import type { Role } from "@/modules/auth/permissions";
import { generateToken, hashToken } from "@/modules/auth/tokens";
import { BusinessError, NotFound } from "@/shared/errors";
import type { InvitationInput } from "./schema";
import type { InvitationPreview, Member, PendingInvitation } from "./types";

export const INVITATION_DAYS = 7;

function invitationExpiry() {
  return new Date(Date.now() + INVITATION_DAYS * 24 * 60 * 60 * 1000);
}

export async function listMembers(
  organizationId: string,
): Promise<{ members: Member[]; invitations: PendingInvitation[] }> {
  return withOrganization(organizationId, async (tx) => {
    const [memberships, invitations] = await Promise.all([
      tx.membership.findMany({
        where: { organizationId },
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      tx.invitation.findMany({
        where: { organizationId, acceptedAt: null, revokedAt: null },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const now = Date.now();
    return {
      members: memberships.map((m) => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt,
      })),
      invitations: invitations.map((i) => ({ ...i, expired: i.expiresAt.getTime() < now })),
    };
  });
}

/**
 * RN-33 — the organization always keeps at least one administrator.
 *
 * Locks the organization's admin rows first, so two admins demoting or
 * removing each other at the same time serialize here: the second one sees
 * the first one's change and is refused, instead of both passing the check.
 */
async function assertKeepsAnAdmin(tx: Tx, organizationId: string, membershipId: string) {
  const admins = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM memberships
    WHERE organization_id = ${organizationId}::uuid AND role = 'ADMIN'
    FOR UPDATE`;

  if (admins.length === 1 && admins[0].id === membershipId) {
    throw new BusinessError("A empresa precisa ter pelo menos um administrador.");
  }
}

export async function changeMemberRole(organizationId: string, membershipId: string, role: Role) {
  await withOrganization(organizationId, async (tx) => {
    const membership = await tx.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFound("Membro");

    if (membership.role === "ADMIN" && role !== "ADMIN") {
      await assertKeepsAnAdmin(tx, organizationId, membershipId);
    }
    await tx.membership.update({ where: { id: membershipId }, data: { role } });
  });
}

export async function removeMember(organizationId: string, membershipId: string) {
  await withOrganization(organizationId, async (tx) => {
    const membership = await tx.membership.findUnique({ where: { id: membershipId } });
    if (!membership) throw new NotFound("Membro");

    if (membership.role === "ADMIN") {
      await assertKeepsAnAdmin(tx, organizationId, membershipId);
    }
    await tx.membership.delete({ where: { id: membershipId } });
  });
}

/**
 * Creates an invitation and returns the raw token for the link — the only
 * moment it exists in the clear. A newer invitation to the same e-mail
 * replaces any pending one, so there's never two live links for one person.
 */
export async function createInvitation(
  organizationId: string,
  invitedById: string,
  input: InvitationInput,
): Promise<{ id: string; token: string }> {
  return withOrganization(organizationId, async (tx) => {
    // RLS on `users` only exposes members of this organization, so this
    // finds the user exactly when they're already in.
    const alreadyMember = await tx.membership.findFirst({
      where: { organizationId, user: { email: input.email } },
      select: { id: true },
    });
    if (alreadyMember) {
      throw new BusinessError("Esta pessoa já faz parte da empresa.", "email");
    }

    await tx.invitation.updateMany({
      where: { organizationId, email: input.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    const token = generateToken();
    const invitation = await tx.invitation.create({
      data: {
        organizationId,
        email: input.email,
        role: input.role,
        invitedById,
        tokenHash: hashToken(token),
        expiresAt: invitationExpiry(),
      },
    });

    return { id: invitation.id, token };
  });
}

/**
 * Issues a fresh link for a pending invitation (and restarts its validity).
 * Needed because only the hash is stored: the old link can't be shown again.
 */
export async function regenerateInvitationLink(organizationId: string, invitationId: string): Promise<string> {
  return withOrganization(organizationId, async (tx) => {
    const token = generateToken();
    const { count } = await tx.invitation.updateMany({
      where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
      data: { tokenHash: hashToken(token), expiresAt: invitationExpiry() },
    });
    if (count === 0) throw new NotFound("Convite");
    return token;
  });
}

export async function revokeInvitation(organizationId: string, invitationId: string) {
  await withOrganization(organizationId, async (tx) => {
    const { count } = await tx.invitation.updateMany({
      where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new NotFound("Convite");
  });
}

/**
 * Resolves an invitation link. Owner role: whoever opens the link isn't a
 * member yet, so the organization can only be learned from the token itself.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const invitation = await prismaAdmin.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
  if (!invitation) return null;

  const status = invitation.acceptedAt
    ? "ACCEPTED"
    : invitation.revokedAt
      ? "REVOKED"
      : invitation.expiresAt.getTime() < Date.now()
        ? "EXPIRED"
        : "PENDING";

  return {
    organizationId: invitation.organization.id,
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role,
    status,
  };
}

/**
 * Accepts an invitation for the signed-in user and returns the organization
 * id. The link was sent to one e-mail, so only the account with that e-mail
 * can use it — a forwarded link doesn't let someone else in.
 */
export async function acceptInvitation(
  token: string,
  user: { userId: string; email: string },
): Promise<string> {
  const preview = await getInvitationPreview(token);
  if (!preview) throw new NotFound("Convite");
  if (preview.status === "ACCEPTED") throw new BusinessError("Este convite já foi usado.");
  if (preview.status === "REVOKED") throw new BusinessError("Este convite foi cancelado.");
  if (preview.status === "EXPIRED") throw new BusinessError("Este convite expirou. Peça um novo link.");
  if (preview.email !== user.email.toLowerCase()) {
    throw new BusinessError(`Este convite foi enviado para ${preview.email}. Entre com essa conta para aceitá-lo.`);
  }

  const organizationId = preview.organizationId;
  await withOrganization(organizationId, async (tx) => {
    // Claims the invitation atomically: a double click or two tabs can't
    // both get past this.
    const { count } = await tx.invitation.updateMany({
      where: {
        tokenHash: hashToken(token),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date() },
    });
    if (count === 0) throw new BusinessError("Este convite não está mais disponível.");

    // Someone who is already a member keeps their current role.
    await tx.membership.upsert({
      where: { userId_organizationId: { userId: user.userId, organizationId } },
      create: { userId: user.userId, organizationId, role: preview.role },
      update: {},
    });
  });

  return organizationId;
}
