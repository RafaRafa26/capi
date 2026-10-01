import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin } from "@/db/client";
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment";
import { BusinessError, NotFound } from "@/shared/errors";
import {
  acceptInvitation,
  changeMemberRole,
  createInvitation,
  getInvitationPreview,
  listMembers,
  regenerateInvitationLink,
  removeMember,
  revokeInvitation,
} from "./service";

let org: TestOrg;
let other: TestOrg;
let adminMembershipId: string;

async function createUser(label: string) {
  const email = `member-${label}-${Date.now()}@example.test`;
  const user = await prismaAdmin.user.create({ data: { name: label, email, passwordHash: "unused" } });
  return { userId: user.id, email };
}

beforeAll(async () => {
  org = await createTestOrganization("Members");
  other = await createTestOrganization("Members other");
  adminMembershipId = (await prismaAdmin.membership.findFirstOrThrow({ where: { organizationId: org.id } })).id;
});

afterAll(async () => {
  await removeTestOrganizations([org.id, other.id]);
});

describe("members — RN-33, always an administrator", () => {
  it("refuses demoting the only administrator", async () => {
    await expect(changeMemberRole(org.id, adminMembershipId, "OPERATOR")).rejects.toThrow(BusinessError);
  });

  it("refuses removing the only administrator", async () => {
    await expect(removeMember(org.id, adminMembershipId)).rejects.toThrow(BusinessError);
  });

  it("allows it once there's a second administrator, and two concurrent demotions can't both pass", async () => {
    const second = await createUser("second-admin");
    const membership = await prismaAdmin.membership.create({
      data: { organizationId: org.id, userId: second.userId, role: "ADMIN" },
    });

    const results = await Promise.allSettled([
      changeMemberRole(org.id, adminMembershipId, "OPERATOR"),
      changeMemberRole(org.id, membership.id, "OPERATOR"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);

    const admins = await prismaAdmin.membership.count({ where: { organizationId: org.id, role: "ADMIN" } });
    expect(admins).toBe(1);

    // Back to the starting point: the original admin is the admin, `second` leaves.
    await prismaAdmin.membership.update({ where: { id: adminMembershipId }, data: { role: "ADMIN" } });
    await removeMember(org.id, membership.id);
  });

  it("doesn't touch a membership of another organization", async () => {
    const otherMembership = await prismaAdmin.membership.findFirstOrThrow({ where: { organizationId: other.id } });
    await expect(removeMember(org.id, otherMembership.id)).rejects.toThrow(NotFound);
  });
});

describe("invitations", () => {
  it("invites by e-mail and the invited account joins with the invited role", async () => {
    const invitee = await createUser("invitee");
    const { token } = await createInvitation(org.id, org.userId, { email: invitee.email, role: "VIEWER" });

    expect(await getInvitationPreview(token)).toMatchObject({
      organizationId: org.id,
      email: invitee.email,
      role: "VIEWER",
      status: "PENDING",
    });

    expect(await acceptInvitation(token, invitee)).toBe(org.id);

    const { members } = await listMembers(org.id);
    expect(members.find((m) => m.userId === invitee.userId)?.role).toBe("VIEWER");
    expect((await getInvitationPreview(token))?.status).toBe("ACCEPTED");
  });

  it("a link can be used only once", async () => {
    const invitee = await createUser("once");
    const { token } = await createInvitation(org.id, org.userId, { email: invitee.email, role: "OPERATOR" });

    const results = await Promise.allSettled([acceptInvitation(token, invitee), acceptInvitation(token, invitee)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await expect(acceptInvitation(token, invitee)).rejects.toThrow(BusinessError);
  });

  it("only the invited e-mail can accept", async () => {
    const invitee = await createUser("right");
    const intruder = await createUser("wrong");
    const { token } = await createInvitation(org.id, org.userId, { email: invitee.email, role: "ADMIN" });

    await expect(acceptInvitation(token, intruder)).rejects.toThrow(BusinessError);
    expect((await getInvitationPreview(token))?.status).toBe("PENDING");
  });

  it("refuses inviting someone who is already a member", async () => {
    const member = await prismaAdmin.user.findUniqueOrThrow({ where: { id: org.userId } });
    await expect(
      createInvitation(org.id, org.userId, { email: member.email, role: "OPERATOR" }),
    ).rejects.toThrow(BusinessError);
  });

  it("a member of another organization can be invited — one login, several companies", async () => {
    const outsider = await prismaAdmin.user.findUniqueOrThrow({ where: { id: other.userId } });
    const { token } = await createInvitation(org.id, org.userId, { email: outsider.email, role: "OPERATOR" });
    await acceptInvitation(token, { userId: outsider.id, email: outsider.email });

    const organizations = await prismaAdmin.membership.findMany({ where: { userId: outsider.id } });
    expect(organizations.map((m) => m.organizationId).sort()).toEqual([org.id, other.id].sort());
  });

  it("a new link replaces the old one; revoked and expired links don't work", async () => {
    const invitee = await createUser("regen");
    const { id, token: oldToken } = await createInvitation(org.id, org.userId, {
      email: invitee.email,
      role: "OPERATOR",
    });

    const newToken = await regenerateInvitationLink(org.id, id);
    expect(await getInvitationPreview(oldToken)).toBeNull();
    expect((await getInvitationPreview(newToken))?.status).toBe("PENDING");

    await revokeInvitation(org.id, id);
    expect((await getInvitationPreview(newToken))?.status).toBe("REVOKED");
    await expect(acceptInvitation(newToken, invitee)).rejects.toThrow(BusinessError);

    const { id: expiredId, token: expiredToken } = await createInvitation(org.id, org.userId, {
      email: invitee.email,
      role: "OPERATOR",
    });
    await prismaAdmin.invitation.update({ where: { id: expiredId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await getInvitationPreview(expiredToken))?.status).toBe("EXPIRED");
    await expect(acceptInvitation(expiredToken, invitee)).rejects.toThrow(BusinessError);
  });

  it("inviting the same e-mail again revokes the previous pending invitation", async () => {
    const invitee = await createUser("twice");
    const first = await createInvitation(org.id, org.userId, { email: invitee.email, role: "OPERATOR" });
    await createInvitation(org.id, org.userId, { email: invitee.email, role: "VIEWER" });

    expect((await getInvitationPreview(first.token))?.status).toBe("REVOKED");
    const { invitations } = await listMembers(org.id);
    expect(invitations.filter((i) => i.email === invitee.email)).toHaveLength(1);
  });

  it("can't manage another organization's invitations", async () => {
    const { id } = await createInvitation(other.id, other.userId, {
      email: `cross-${Date.now()}@example.test`,
      role: "OPERATOR",
    });
    await expect(revokeInvitation(org.id, id)).rejects.toThrow(NotFound);
    await expect(regenerateInvitationLink(org.id, id)).rejects.toThrow(NotFound);
  });
});
