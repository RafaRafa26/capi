"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { saleInputSchema } from "@/modules/sales/schema";
import { createSale } from "@/modules/sales/service";
import { failure, type Result } from "@/shared/errors";

export async function createSaleAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const payload = JSON.parse(String(form.get("payload") ?? "{}"));
    const parsed = saleInputSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createSale(session.organizationId, parsed.data);
    revalidatePath("/dashboard");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
