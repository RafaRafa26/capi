import type { NextRequest } from "next/server"

import { statementFileName } from "@/lib/bank-accounts/statement"
import { buildBankStatementXlsx } from "@/lib/bank-accounts/statement-xlsx"

import { loadBankStatementExport } from "../load-statement"

export async function GET(request: NextRequest) {
  const data = await loadBankStatementExport(request)
  if (data instanceof Response) return data

  const xlsx = await buildBankStatementXlsx(data)
  return new Response(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${statementFileName(data.bankAccount.name, data.month, data.series, "xlsx")}"`,
      "Cache-Control": "no-store",
    },
  })
}
