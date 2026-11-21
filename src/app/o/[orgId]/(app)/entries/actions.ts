"use server";

import { revalidatePath } from "next/cache";

import { orgPath } from "@/lib/org-path";
import { requireSession } from "@/modules/auth/session";
import { listBankAccounts } from "@/modules/bank-accounts/service";
import type { BankAccount } from "@/modules/bank-accounts/types";
import { listCategories } from "@/modules/categories/service";
import type { Category } from "@/modules/categories/types";
import { listContacts } from "@/modules/contacts/service";
import type { Contact } from "@/modules/contacts/types";
import { expenseInputSchema } from "@/modules/expenses/schema";
import { createExpense } from "@/modules/expenses/service";
import { saleInputSchema } from "@/modules/sales/schema";
import { createSale } from "@/modules/sales/service";
import { failure, type Result } from "@/shared/errors";

export interface EntryOptions {
  contacts: Contact[];
  categories: Category[];
  bankAccounts: BankAccount[];
}

/**
 * The lists the "Registrar" sheet picks from. Loaded when the sheet opens
 * (or the Registrar button is hovered) rather than by the app layout, so
 * pages that never register anything don't pay for three extra queries.
 */
export async function loadEntryOptionsAction(): Promise<Result<EntryOptions>> {
  try {
    const session = await requireSession("write");
    const [contacts, categories, bankAccounts] = await Promise.all([
      listContacts(session.organizationId),
      listCategories(session.organizationId),
      listBankAccounts(session.organizationId),
    ]);
    return { ok: true, data: { contacts, categories, bankAccounts } };
  } catch (error) {
    return failure(error);
  }
}

// The sheet opens over any screen of the organization, so every one of them
// may be showing the new entries (dashboard, contas a pagar/receber, extratos).
function revalidateOrganization(organizationId: string) {
  revalidatePath(orgPath(organizationId, "/"), "layout");
}

export async function createSaleAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession("write");

    const payload = JSON.parse(String(form.get("payload") ?? "{}"));
    const parsed = saleInputSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createSale(session.organizationId, parsed.data);
    revalidateOrganization(session.organizationId);

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function createExpenseAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession("write");

    const payload = JSON.parse(String(form.get("payload") ?? "{}"));
    const parsed = expenseInputSchema.safeParse(payload);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createExpense(session.organizationId, parsed.data);
    revalidateOrganization(session.organizationId);

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
