"use server";

import { revalidatePath } from "next/cache";

import { orgPath } from "@/lib/org-path";
import { requireSession } from "@/modules/auth/session";
import { invitationInputSchema, roleSchema } from "@/modules/members/schema";
import {
  changeMemberRole,
  createInvitation,
  regenerateInvitationLink,
  removeMember,
  revokeInvitation,
} from "@/modules/members/service";
import { failure, type Result } from "@/shared/errors";

// The link itself is assembled in the browser (window.location.origin): the
// action only hands back the token, which exists in the clear just here.

export async function inviteMemberAction(form: FormData): Promise<Result<{ token: string }>> {
  try {
    const session = await requireSession("manageMembers");

    const parsed = invitationInputSchema.safeParse({
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const { token } = await createInvitation(session.organizationId, session.userId, parsed.data);
    revalidatePath(orgPath(session.organizationId, "/members"));

    return { ok: true, data: { token } };
  } catch (error) {
    return failure(error);
  }
}

export async function regenerateInvitationLinkAction(invitationId: string): Promise<Result<{ token: string }>> {
  try {
    const session = await requireSession("manageMembers");
    const token = await regenerateInvitationLink(session.organizationId, invitationId);
    revalidatePath(orgPath(session.organizationId, "/members"));
    return { ok: true, data: { token } };
  } catch (error) {
    return failure(error);
  }
}

export async function revokeInvitationAction(invitationId: string): Promise<Result> {
  try {
    const session = await requireSession("manageMembers");
    await revokeInvitation(session.organizationId, invitationId);
    revalidatePath(orgPath(session.organizationId, "/members"));
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function changeMemberRoleAction(membershipId: string, role: string): Promise<Result> {
  try {
    const session = await requireSession("manageMembers");

    const parsed = roleSchema.safeParse(role);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    await changeMemberRole(session.organizationId, membershipId, parsed.data);
    revalidatePath(orgPath(session.organizationId, "/members"));
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMemberAction(membershipId: string): Promise<Result> {
  try {
    const session = await requireSession("manageMembers");
    await removeMember(session.organizationId, membershipId);
    revalidatePath(orgPath(session.organizationId, "/members"));
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
