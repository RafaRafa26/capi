import { renderToBuffer } from "@react-pdf/renderer"
import type { NextRequest } from "next/server"

import { SettlementReceiptPdf } from "@/components/accounts/settlement-receipt-pdf"
import { currentSession, currentUser } from "@/modules/auth/session"
import { issueSettlementReceipt } from "@/modules/settlements/service"
import { NotFound } from "@/shared/errors"

export async function GET(_request: NextRequest, ctx: RouteContext<"/o/[orgId]/receipts/[id]">) {
  if (!(await currentUser())) return new Response("Faça login para emitir o recibo.", { status: 401 })
  // Não membro recebe 404, igual organização inexistente — ids não podem ser sondados.
  const session = await currentSession()
  if (!session) return new Response("Não encontrado.", { status: 404 })

  const { id } = await ctx.params

  let receipt
  try {
    receipt = await issueSettlementReceipt(session.organizationId, id)
  } catch (error) {
    if (error instanceof NotFound) return new Response("Não encontrado.", { status: 404 })
    throw error
  }

  const pdf = await renderToBuffer(
    <SettlementReceiptPdf
      receipt={receipt}
      organization={{ name: session.organizationName, document: session.organizationDocument }}
      generatedAt={new Date()}
    />,
  )
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: abre no visualizador do navegador, na aba nova.
      "Content-Disposition": `inline; filename="recibo-${(receipt.number ?? receipt.id).replace("/", "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
