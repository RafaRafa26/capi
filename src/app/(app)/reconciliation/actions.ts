"use server";

import { requireSession } from "@/modules/auth/session";
import { importStatementInputSchema } from "@/modules/statements/schema";
import { deleteBankTransaction, importStatement, listBankTransactions } from "@/modules/statements/service";
import type { BankTransaction, ImportStatementResult } from "@/modules/statements/types";
import { failure, type Result } from "@/shared/errors";

export async function importStatementAction(form: FormData): Promise<Result<ImportStatementResult>> {
  try {
    const session = await requireSession();

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Selecione um arquivo OFX.", field: "file" };
    }

    const parsed = importStatementInputSchema.safeParse({
      bankAccountId: String(form.get("bankAccountId") ?? ""),
      fileName: file.name,
      content: await file.text(),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const result = await importStatement(session.organizationId, parsed.data);
    return { ok: true, data: result };
  } catch (error) {
    return failure(error);
  }
}

export async function listBankTransactionsAction(bankAccountId: string): Promise<Result<BankTransaction[]>> {
  try {
    const session = await requireSession();
    const transactions = await listBankTransactions(session.organizationId, bankAccountId);
    return { ok: true, data: transactions };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteBankTransactionAction(id: string): Promise<Result> {
  try {
    const session = await requireSession();
    await deleteBankTransaction(session.organizationId, id);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
