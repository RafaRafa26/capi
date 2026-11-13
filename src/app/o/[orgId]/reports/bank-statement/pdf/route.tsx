import { renderToBuffer } from "@react-pdf/renderer"
import type { NextRequest } from "next/server"

import { BankStatementPdf } from "@/components/bank-accounts/bank-statement-pdf"
import { statementFileName } from "@/lib/bank-accounts/statement"

import { loadBankStatementExport } from "../load-statement"

export async function GET(request: NextRequest) {
  const data = await loadBankStatementExport(request)
  if (data instanceof Response) return data

  const pdf = await renderToBuffer(<BankStatementPdf {...data} />)
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: abre no visualizador do navegador, na aba nova.
      "Content-Disposition": `inline; filename="${statementFileName(data.bankAccount.name, data.month, data.series, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  })
}
