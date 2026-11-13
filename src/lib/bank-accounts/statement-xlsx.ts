// O extrato da conta em planilha — mesmo mês, filtro e saldos do PDF
// (bank-statement-pdf.tsx), com valores e datas como números de verdade.
import ExcelJS from "exceljs"

import { formatBankAccountNumbers, formatMonthYear } from "@/lib/format"
import { statementLineText, statementSeriesLabel, type BankStatementExport } from "./statement"

const MONEY = '"R$" #,##0.00'
const DATE = "dd/mm/yyyy"

// Datas no fuso local viram meia-noite UTC — senão o Excel mostra o dia
// anterior para quem está a oeste de Greenwich.
function excelDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export async function buildBankStatementXlsx(data: BankStatementExport): Promise<Buffer> {
  const { bankAccount, month, series, view } = data
  const workbook = new ExcelJS.Workbook()
  workbook.created = data.generatedAt
  const sheet = workbook.addWorksheet("Extrato")

  const columns = [
    { header: "Data", width: 12, numFmt: DATE },
    { header: "Descrição", width: 50, wrap: true },
    { header: "Contato", width: 30 },
    { header: "Descrição no banco", width: 45, wrap: true },
    { header: "Valor", width: 15, numFmt: MONEY },
    { header: "Saldo", width: 15, numFmt: MONEY },
  ]
  const amountColumn = 5
  const balanceColumn = 6

  sheet.addRow([data.organizationName]).font = { size: 9, color: { argb: "FF4B5563" } }
  sheet.addRow([`Extrato - ${bankAccount.name}`]).font = { size: 14, bold: true }
  sheet.addRow([
    [
      [bankAccount.bank, formatBankAccountNumbers(bankAccount)].filter(Boolean).join(" "),
      formatMonthYear(month),
      series === "saldo" ? null : `somente ${statementSeriesLabel[series].toLowerCase()}`,
    ]
      .filter(Boolean)
      .join(" · "),
  ])
  sheet.addRow([`Gerado em ${data.generatedAt.toLocaleDateString("pt-BR")}`]).font = { color: { argb: "FF4B5563" } }
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

  const opening = sheet.addRow([excelDate(view.openingDate), "Saldo anterior"])
  opening.getCell(balanceColumn).value = view.openingBalance / 100
  opening.font = { color: { argb: "FF4B5563" } }

  for (const line of view.lines) {
    const text = statementLineText(line)
    const row = sheet.addRow([
      excelDate(line.date),
      text.title,
      text.contacts,
      text.bankDescription,
      line.amount / 100,
      line.runningBalance / 100,
    ])
    row.alignment = { vertical: "top" }
  }

  sheet.addRow([])
  const totals: [string, number][] = [
    ["Entradas no mês", view.entradas],
    ["Saídas no mês", -view.saidas],
    ["Saldo final", view.closingBalance],
  ]
  for (const [label, value] of totals) {
    const row = sheet.addRow([])
    row.getCell(1).value = label
    row.getCell(label === "Saldo final" ? balanceColumn : amountColumn).value = value / 100
    row.font = { bold: true }
  }

  sheet.views = [{ state: "frozen", ySplit: headerRowNumber }]
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columns.length },
  }

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
