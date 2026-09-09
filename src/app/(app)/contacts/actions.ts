"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { createContact, createQuickClient } from "@/modules/contacts/service";
import { contactInputSchema, quickClientSchema } from "@/modules/contacts/schema";
import { failure, type Result } from "@/shared/errors";
import type { Contact } from "@/modules/contacts/types";

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

/** Quick-add used by the new-sale screen's client combobox. */
export async function createQuickClientAction(form: FormData): Promise<Result<Contact>> {
  try {
    const session = await requireSession();

    const parsed = quickClientSchema.safeParse({ name: String(form.get("name") ?? "") });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const contact = await createQuickClient(session.organizationId, parsed.data.name);
    revalidatePath("/contacts");

    return { ok: true, data: contact };
  } catch (error) {
    return failure(error);
  }
}
