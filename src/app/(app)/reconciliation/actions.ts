"use server";

import { requireSession } from "@/modules/auth/session";
import {
  createAndSettlePayableInputSchema,
  createSettlementBatchInputSchema,
  createSettlementInputSchema,
  manualSettleInputSchema,
  searchCandidateEntriesInputSchema,
} from "@/modules/settlements/schema";
import {
  createAndSettlePayable,
  createAndSettleReceivable,
  createSettlement,
  createSettlementBatch,
  getMatchInfoForTransactions,
  listCandidateEntries,
  manualSettleEntry,
  undoSettlement,
} from "@/modules/settlements/service";
import type { CandidateEntry, TransactionMatchInfo } from "@/modules/settlements/types";
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

export async function searchCandidateEntriesAction(input: unknown): Promise<Result<CandidateEntry[]>> {
  try {
    const session = await requireSession();
    const parsed = searchCandidateEntriesInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    const entries = await listCandidateEntries(session.organizationId, parsed.data);
    return { ok: true, data: entries };
  } catch (error) {
    return failure(error);
  }
}

export async function getMatchInfoForTransactionsAction(bankTransactionIds: string[]): Promise<Result<TransactionMatchInfo[]>> {
  try {
    const session = await requireSession();
    const info = await getMatchInfoForTransactions(session.organizationId, bankTransactionIds);
    return { ok: true, data: info };
  } catch (error) {
    return failure(error);
  }
}

export async function createSettlementAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession();
    const parsed = createSettlementInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    await createSettlement(session.organizationId, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function createSettlementBatchAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession();
    const parsed = createSettlementBatchInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    await createSettlementBatch(session.organizationId, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function undoSettlementAction(settlementId: string): Promise<Result> {
  try {
    const session = await requireSession();
    await undoSettlement(session.organizationId, settlementId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function manualSettleEntryAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession();
    const parsed = manualSettleInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    await manualSettleEntry(session.organizationId, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function createAndSettlePayableAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession();
    const parsed = createAndSettlePayableInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    await createAndSettlePayable(session.organizationId, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function createAndSettleReceivableAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession();
    const parsed = createAndSettlePayableInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }
    await createAndSettleReceivable(session.organizationId, parsed.data);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
