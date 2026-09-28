"use server"

import { revalidatePath } from "next/cache"

import { getAccountEntryById } from "@/modules/accounts/service"
import type { AccountEntry } from "@/modules/accounts/types"
import { requireSession } from "@/modules/auth/session"
import { generatePayoutInputSchema } from "@/modules/payouts/schema"
import { generatePayout, getBeneficiaryStatement, listAvailableCredits } from "@/modules/payouts/service"
import type { BeneficiaryCredit, BeneficiaryStatement } from "@/modules/payouts/types"
import { failure, type Result } from "@/shared/errors"

export async function getBeneficiaryStatementAction(beneficiaryId: string): Promise<Result<BeneficiaryStatement>> {
  try {
    const session = await requireSession()
    const statement = await getBeneficiaryStatement(session.organizationId, beneficiaryId)
    return { ok: true, data: statement }
  } catch (error) {
    return failure(error)
  }
}

export async function listAvailableCreditsAction(beneficiaryId: string): Promise<Result<BeneficiaryCredit[]>> {
  try {
    const session = await requireSession()
    const credits = await listAvailableCredits(session.organizationId, beneficiaryId)
    return { ok: true, data: credits }
  } catch (error) {
    return failure(error)
  }
}

/** O lançamento original por trás de uma linha do extrato, pro Sheet de detalhe. */
export async function getAccountEntryAction(entryId: string): Promise<Result<AccountEntry>> {
  try {
    const session = await requireSession()
    const entry = await getAccountEntryById(session.organizationId, entryId)
    return { ok: true, data: entry }
  } catch (error) {
    return failure(error)
  }
}

export async function generatePayoutAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession()
    const parsed = generatePayoutInputSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return { ok: false, error: issue.message, field: String(issue.path[0]) }
    }

    await generatePayout(session.organizationId, parsed.data)
    // O repasse nasce como conta a pagar — some nas duas telas de uma vez.
    revalidatePath("/payout")
    revalidatePath("/payables")

    return { ok: true, data: undefined }
  } catch (error) {
    return failure(error)
  }
}
