"use server";

import { track } from "@/lib/analytics/server";
import { requireUser } from "@/modules/auth/session";
import { acceptInvitation } from "@/modules/members/service";
import { failure, type Result } from "@/shared/errors";

export async function acceptInvitationAction(token: string): Promise<Result<{ organizationId: string }>> {
  try {
    const user = await requireUser();
    const organizationId = await acceptInvitation(token, user);
    track({ userId: user.userId, organizationId }, "invitation_accepted");
    return { ok: true, data: { organizationId } };
  } catch (error) {
    return failure(error);
  }
}
