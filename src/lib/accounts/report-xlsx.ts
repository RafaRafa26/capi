// O relatório de contas em planilha — mesmas seções por favorecido e mesmos
// totais do PDF (report.ts), mas com valores e datas como números de verdade,
// para quem quiser somar ou filtrar no Excel.
import ExcelJS from "exceljs"

import { kindConfig } from "@/lib/accounts/labels"
import type { AccountsReport } from "@/lib/accounts/report"

const MONEY = '"R$" #,##0.00'
const DATE = "dd/mm/yyyy"

// Datas no fuso local viram meia-noite UTC — senão o Excel mostra o dia
// anterior para quem está a oeste de Greenwich.
function excelDate(date: Date | null): Date | null {
  return date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) : null
}

export async function buildAccountsReportXlsx(report: AccountsReport): Promise<Buffer> {
  const config = kindConfig[report.kind]
  const workbook = new ExcelJS.Workbook()
  workbook.created = report.generatedAt
  const sheet = workbook.addWorksheet(report.title)

  const columns = [
    { header: report.groupLabel, width: 26 },
    { header: "Vencimento", width: 12, numFmt: DATE },
    { header: config.paymentColumnLabel, width: 13, numFmt: DATE },
    { header: "Parcela", width: 9 },
    { header: "Descrição", width: 50, wrap: true },
    { header: "Categoria", width: 20 },
    { header: config.contactLabel, width: 28 },
    { header: "Total", width: 15, numFmt: MONEY },
    { header: config.summaryPaidLabel, width: 15, numFmt: MONEY },
    { header: config.amountColumnLabel, width: 15, numFmt: MONEY },
    { header: "Situação", width: 12 },
    { header: "Marcador", width: 20 },
    { header: "Observação", width: 50, wrap: true },
    { header: "Data obs.", width: 12, numFmt: DATE },
  ]
  const lastColumn = columns.length
  const openColumn = 10

  sheet.addRow([report.organizationName]).font = { size: 9, color: { argb: "FF4B5563" } }
  sheet.addRow([report.title]).font = { size: 14, bold: true }
  sheet.addRow([[report.periodLabel, report.filtersLabel].filter(Boolean).join(" · ")])
  sheet.addRow([`Gerado em ${report.generatedAt.toLocaleDateString("pt-BR")}`]).font = { color: { argb: "FF4B5563" } }
  sheet.addRow([])

  const header = sheet.addRow(columns.map((column) => column.header))
  header.font = { bold: true, color: { argb: "FFFFFFFF" } }
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } }
  const headerRowNumber = header.number

  columns.forEach((column, index) => {
    const sheetColumn = sheet.getColumn(index + 1)
    sheetColumn.width = column.width
    if (column.numFmt) sheetColumn.numFmt = column.numFmt
    if (column.wrap) sheetColumn.alignment = { wrapText: true, vertical: "top" }
  })

  for (const group of report.groups) {
    for (const item of group.entries) {
      const { entry } = item
      const row = sheet.addRow([
        group.name,
        excelDate(entry.dueDate),
        excelDate(entry.paidAt),
        entry.installment ?? "",
        item.sharedWith.length > 0
          ? `${entry.description} (dividido com ${item.sharedWith.join(", ")})`
          : entry.description,
        entry.categoryName,
        entry.contactName,
        entry.amount / 100,
        Math.min(entry.settledAmount, entry.amount) / 100,
        item.openAmount / 100,
        item.statusLabel,
        entry.marker?.name ?? "",
        entry.notes ?? "",
        excelDate(entry.notesUpdatedAt),
      ])
      row.alignment = { vertical: "top" }
    }
    const subtotal = sheet.addRow([])
    subtotal.getCell(1).value = `Subtotal em aberto — ${group.name}`
    subtotal.getCell(openColumn).value = group.openTotal / 100
    subtotal.font = { bold: true }
    subtotal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } }
  }

  sheet.addRow([])
  const total = sheet.addRow([])
  total.getCell(1).value = "TOTAL EM ABERTO"
  total.getCell(openColumn).value = report.totals.open / 100
  total.font = { bold: true, size: 12 }
  total.border = { top: { style: "medium" } }

  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }]
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: lastColumn },
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
