import "server-only"

import type { NextRequest } from "next/server"

import { buildAccountsReport, type AccountsReport } from "@/lib/accounts/report"
import { listPayables, listReceivables } from "@/modules/accounts/service"
import { currentSession, currentUser } from "@/modules/auth/session"

/**
 * Shared by the pdf/ and xlsx/ routes: the filtered report, or the Response
 * to send instead — 401 without login, 404 when the user isn't a member
 * (same as a missing organization, so ids can't be probed).
 */
export async function loadAccountsReport(request: NextRequest): Promise<AccountsReport | Response> {
  if (!(await currentUser())) return new Response("Faça login para exportar.", { status: 401 })
  const session = await currentSession()
  if (!session) return new Response("Não encontrado.", { status: 404 })

  const params = request.nextUrl.searchParams
  const kind = params.get("kind") === "pay" ? "pay" : "rec"
  const entries =
    kind === "pay" ? await listPayables(session.organizationId) : await listReceivables(session.organizationId)

  return buildAccountsReport({
    entries,
    kind,
    params,
    organizationName: session.organizationName,
    today: new Date(),
  })
}
