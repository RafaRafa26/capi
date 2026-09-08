"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { createBankAccount } from "@/modules/bank-accounts/service";
import { bankAccountInputSchema } from "@/modules/bank-accounts/schema";
import { failure, type Result } from "@/shared/errors";

export async function createBankAccountAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const parsed = bankAccountInputSchema.safeParse({
      name: String(form.get("name") ?? ""),
      bank: String(form.get("bank") ?? ""),
      branchNumber: String(form.get("branchNumber") ?? ""),
      accountNumber: String(form.get("accountNumber") ?? ""),
      kind: String(form.get("kind") ?? ""),
      holderType: String(form.get("holderType") ?? ""),
      controlStartDate: String(form.get("controlStartDate") ?? ""),
      initialBalance: Number(form.get("initialBalance") ?? 0),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createBankAccount(session.organizationId, parsed.data);
    revalidatePath("/bank-accounts");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
