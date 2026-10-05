import type { NextRequest } from "next/server"

import { reportFileName } from "@/lib/accounts/report"
import { buildAccountsReportXlsx } from "@/lib/accounts/report-xlsx"

import { loadAccountsReport } from "../load-report"

export async function GET(request: NextRequest) {
  const report = await loadAccountsReport(request)
  if (report instanceof Response) return report

  const xlsx = await buildAccountsReportXlsx(report)
  return new Response(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${reportFileName(report, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  })
}
