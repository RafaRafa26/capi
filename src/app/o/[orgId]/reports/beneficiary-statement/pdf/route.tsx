import { renderToBuffer } from "@react-pdf/renderer"
import { endOfDay, startOfDay } from "date-fns"
import type { NextRequest } from "next/server"

import { fromParamDate } from "@/lib/accounts/params"
import { BeneficiaryStatementPdf } from "@/components/payout/beneficiary-statement-pdf"
import { currentSession, currentUser } from "@/modules/auth/session"
import { getBeneficiaryStatement } from "@/modules/payouts/service"
import { sliceStatement } from "@/modules/payouts/statement"
import { NotFound } from "@/shared/errors"

export async function GET(request: NextRequest) {
  if (!(await currentUser())) return new Response("Faça login para exportar.", { status: 401 })
  // Não membro recebe 404, igual organização inexistente — ids não podem ser sondados.
  const session = await currentSession()
  if (!session) return new Response("Não encontrado.", { status: 404 })

  const params = request.nextUrl.searchParams
  const beneficiaryId = params.get("beneficiaryId")
  if (!beneficiaryId) return new Response("Favorecido não informado.", { status: 400 })

  const from = fromParamDate(params.get("from"))
  const to = fromParamDate(params.get("to"))

  let statement
  try {
    statement = await getBeneficiaryStatement(session.organizationId, beneficiaryId)
  } catch (error) {
    if (error instanceof NotFound) return new Response("Não encontrado.", { status: 404 })
    throw error
  }

  const slice = sliceStatement(statement.lines, {
    from: from ? startOfDay(from) : null,
    to: to ? endOfDay(to) : null,
  })

  const pdf = await renderToBuffer(
    <BeneficiaryStatementPdf
      organizationName={session.organizationName}
      statement={statement}
      slice={slice}
      from={from}
      to={to}
      generatedAt={new Date()}
    />,
  )
  const fileName = `extrato-${statement.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}.pdf`
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: abre no visualizador do navegador, na aba nova.
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
