"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { createContact } from "@/modules/contacts/service";
import { contactInputSchema } from "@/modules/contacts/schema";
import { failure, type Result } from "@/shared/errors";

export async function createContactAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const payload = JSON.parse(String(form.get("payload") ?? "{}"));
    const parsed = contactInputSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createContact(session.organizationId, parsed.data);
    revalidatePath("/contacts");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
