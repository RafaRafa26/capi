"use server";

import { revalidatePath } from "next/cache";

import { expenseInputSchema } from "@/modules/expenses/schema";
import { createExpense } from "@/modules/expenses/service";
import { requireSession } from "@/modules/auth/session";
import { failure, type Result } from "@/shared/errors";

export async function createExpenseAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const payload = JSON.parse(String(form.get("payload") ?? "{}"));
    const parsed = expenseInputSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createExpense(session.organizationId, parsed.data);
    revalidatePath("/dashboard");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
