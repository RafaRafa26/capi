"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/modules/auth/session"
import { updateAccountEntrySchema } from "@/modules/accounts/schema"
import { deleteAccountEntry, updateAccountEntry } from "@/modules/accounts/service"
import { manualSettleInputSchema } from "@/modules/settlements/schema"
import { manualSettleEntry, undoSettlement } from "@/modules/settlements/service"
import { failure, type Result } from "@/shared/errors"

export async function updateAccountEntryAction(entryId: string, form: FormData): Promise<Result> {
  try {
    const session = await requireSession()

    const payload = JSON.parse(String(form.get("payload") ?? "{}"))
    const parsed = updateAccountEntrySchema.safeParse(payload)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, error: issue.message, field: String(issue.path[0]) }
    }

    await updateAccountEntry(session.organizationId, entryId, parsed.data)
    revalidatePath("/payables")
    revalidatePath("/receivables")

    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function deleteAccountEntryAction(entryId: string): Promise<Result> {
  try {
    const session = await requireSession()
    await deleteAccountEntry(session.organizationId, entryId)
    revalidatePath("/payables")
    revalidatePath("/receivables")
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

/** Estorno de uma liquidação específica (histórico de recebimentos/pagamentos) — RN-12/RN-22. */
export async function undoSettlementAction(settlementId: string): Promise<Result> {
  try {
    const session = await requireSession()
    await undoSettlement(session.organizationId, settlementId)
    revalidatePath("/payables")
    revalidatePath("/receivables")
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}

export async function settleAccountEntryAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession()
    const parsed = manualSettleInputSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, error: issue.message, field: String(issue.path[0]) }
    }

    await manualSettleEntry(session.organizationId, parsed.data)
    revalidatePath("/payables")
    revalidatePath("/receivables")
    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}
