"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { createContact, createQuickContact } from "@/modules/contacts/service";
import { contactInputSchema, quickContactSchema } from "@/modules/contacts/schema";
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

/** Quick-add used by the new-sale/new-expense screens' contact combobox. */
export async function createQuickContactAction(form: FormData): Promise<Result<Contact>> {
  try {
    const session = await requireSession();

    const parsed = quickContactSchema.safeParse({
      name: String(form.get("name") ?? ""),
      contactType: String(form.get("contactType") ?? ""),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const contact = await createQuickContact(session.organizationId, parsed.data.name, parsed.data.contactType);
    revalidatePath("/contacts");

    return { ok: true, data: contact };
  } catch (error) {
    return failure(error);
  }
}
