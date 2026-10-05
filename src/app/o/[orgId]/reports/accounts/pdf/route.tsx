import { renderToBuffer } from "@react-pdf/renderer"
import type { NextRequest } from "next/server"

import { AccountsReportPdf } from "@/components/accounts/accounts-report-pdf"
import { reportFileName } from "@/lib/accounts/report"

import { loadAccountsReport } from "../load-report"

export async function GET(request: NextRequest) {
  const report = await loadAccountsReport(request)
  if (report instanceof Response) return report

  const pdf = await renderToBuffer(<AccountsReportPdf report={report} />)
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: abre no visualizador do navegador, na aba nova.
      "Content-Disposition": `inline; filename="${reportFileName(report, "pdf")}"`,
      "Cache-Control": "no-store",
    },
  })
}
