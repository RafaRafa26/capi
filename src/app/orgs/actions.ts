"use server";

import { requireUser } from "@/modules/auth/session";
import { organizationInputSchema } from "@/modules/organizations/schema";
import { createOrganization } from "@/modules/organizations/service";
import { failure, type Result } from "@/shared/errors";

export async function createOrganizationAction(form: FormData): Promise<Result<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = organizationInputSchema.safeParse({
      name: String(form.get("name") ?? ""),
      document: String(form.get("document") ?? ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const organization = await createOrganization(user.userId, parsed.data);
    return { ok: true, data: { id: organization.id } };
  } catch (error) {
    return failure(error);
  }
}
