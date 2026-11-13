import "server-only"

import type { NextRequest } from "next/server"

import {
  fromParamMonth,
  parseStatementSeries,
  statementMonth,
  type BankStatementExport,
} from "@/lib/bank-accounts/statement"
import { currentSession, currentUser } from "@/modules/auth/session"
import { getBankAccountStatement } from "@/modules/bank-accounts/service"
import { NotFound } from "@/shared/errors"

/**
 * Shared by the pdf/ and xlsx/ routes: the month of the extrato exactly as the
 * Contas e Extratos screen shows it (account, month and Saldo/Entradas/Saídas),
 * or the Response to send instead — 401 without login, 404 when the user
 * isn't a member or the account isn't theirs (ids can't be probed).
 */
export async function loadBankStatementExport(request: NextRequest): Promise<BankStatementExport | Response> {
  if (!(await currentUser())) return new Response("Faça login para exportar.", { status: 401 })
  const session = await currentSession()
  if (!session) return new Response("Não encontrado.", { status: 404 })

  const params = request.nextUrl.searchParams
  const bankAccountId = params.get("bankAccountId")
  const month = fromParamMonth(params.get("month"))
  if (!bankAccountId || !month) return new Response("Conta ou mês não informado.", { status: 400 })
  const series = parseStatementSeries(params.get("series"))

  let statement
  try {
    statement = await getBankAccountStatement(session.organizationId, bankAccountId)
  } catch (error) {
    if (error instanceof NotFound) return new Response("Não encontrado.", { status: 404 })
    throw error
  }

  return {
    organizationName: session.organizationName,
    organizationDocument: session.organizationDocument || null,
    bankAccount: statement.bankAccount,
    month,
    series,
    view: statementMonth(statement.lines, statement.bankAccount.initialBalance, month, series),
    generatedAt: new Date(),
  }
}
