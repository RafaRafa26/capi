// O PDF do relatório de contas, renderizado no servidor (react-pdf) pela rota
// reports/accounts/pdf. Uma lista simples: as contas que a tela mostra com os
// filtros do momento (situação, período, chips, busca), uma linha por conta,
// com o marcador de cada uma. A4 em pé (retrato), como os outros PDFs do
// sistema. Cores fixas e claras — não herda o tema da tela.
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { kindConfig } from "@/lib/accounts/labels"
import type { AccountsReport, ReportEntry } from "@/lib/accounts/report"
import { formatBRL, formatDate } from "@/lib/format"
import { markerPrintColor } from "@/lib/marker-colors"
import { PDF_FONT_FAMILY, tabularNumbers } from "@/lib/pdf-fonts"
import { capiHex, printNeutral } from "@/lib/print-palette"

const ink = capiHex.black
const { soft, line, zebra } = printNeutral

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 44,
    paddingHorizontal: 28,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 8.5,
    color: ink,
  },
  orgName: { fontSize: 8, color: soft, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 2 },
  title: { fontSize: 17, fontWeight: 700 },
  count: { fontSize: 8.5, color: soft },
  filters: { fontSize: 8.5, color: soft, marginTop: 4 },
  filtersStrong: { color: ink, fontWeight: 600 },
  rule: { borderBottomWidth: 1, borderBottomColor: ink, marginTop: 10 },
  columns: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: line,
    fontSize: 7,
    fontWeight: 700,
    color: soft,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: line,
  },
  bold: { fontWeight: 700 },
  description: { marginTop: 1.5, color: soft },
  note: { marginTop: 2, fontSize: 7.5, color: soft },
  marker: {
    alignSelf: "flex-start",
    borderRadius: 3,
    borderWidth: 0.75,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontSize: 7,
    fontWeight: 600,
  },
  empty: { marginTop: 28, textAlign: "center", color: soft },
  totals: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 7,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: ink,
    fontWeight: 700,
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    fontSize: 7.5,
    color: soft,
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

// Larguras para A4 em pé: cliente e descrição dividem a mesma coluna (um
// embaixo do outro), que fica com o espaço que sobra.
const col = {
  due: { width: 58, paddingRight: 6 },
  paidAt: { width: 60, paddingRight: 6 },
  contact: { flex: 1, paddingRight: 8 },
  marker: { width: 94, paddingRight: 4 },
  status: { width: 54 },
  amount: { width: 62, textAlign: "right" as const, ...tabularNumbers },
  value: { width: 66, textAlign: "right" as const, ...tabularNumbers },
}

const statusColor = { OVERDUE: capiHex.red, DUE_TODAY: "#b45309" } as const

function EntryRow({ item, index, report }: { item: ReportEntry; index: number; report: AccountsReport }) {
  const { entry } = item
  const showPaidAt = report.status === "PAID"
  const description = entry.installment ? `${entry.installment} · ${entry.description}` : entry.description
  const marker = entry.marker ? markerPrintColor(entry.marker.color) : null
  const value = rowValue(item, report)
  const color = item.status === "OVERDUE" || item.status === "DUE_TODAY" ? statusColor[item.status] : undefined
  return (
    <View wrap={false} style={[styles.row, index % 2 === 1 ? { backgroundColor: zebra } : {}]}>
      <Text style={[col.due, tabularNumbers]}>{formatDate(entry.dueDate)}</Text>
      {showPaidAt && <Text style={[col.paidAt, tabularNumbers]}>{entry.paidAt ? formatDate(entry.paidAt) : "—"}</Text>}
      <View style={col.contact}>
        <Text style={styles.bold}>{entry.contactName}</Text>
        <Text style={styles.description}>{description}</Text>
        {entry.notes && (
          <Text style={styles.note}>
            Obs.{entry.notesUpdatedAt ? ` ${formatDate(entry.notesUpdatedAt)}` : ""}: {entry.notes}
          </Text>
        )}
      </View>
      <View style={col.marker}>
        {entry.marker && marker && (
          <Text style={[styles.marker, { color: marker.text, backgroundColor: marker.background, borderColor: marker.text }]}>
            {entry.marker.name}
          </Text>
        )}
      </View>
      {report.status === null && (
        <Text style={[col.status, color ? { color, fontWeight: 700 } : {}]}>{item.statusLabel}</Text>
      )}
      <Text style={col.amount}>{formatBRL(entry.amount)}</Text>
      <Text style={[col.value, styles.bold]}>{value > 0 ? formatBRL(value) : "—"}</Text>
    </View>
  )
}

// Com o card Recebidos/Pagos, a última coluna é o que foi quitado; nos demais,
// o que ainda falta receber/pagar.
function rowValue(item: ReportEntry, report: AccountsReport): number {
  if (report.status === "PAID") return Math.min(item.entry.settledAmount, item.entry.amount)
  return item.openAmount
}

export function AccountsReportPdf({ report }: { report: AccountsReport }) {
  const config = kindConfig[report.kind]
  const isPaid = report.status === "PAID"
  const valueLabel = isPaid ? config.paidLabel : config.amountColumnLabel
  const count = report.entries.length
  const filters = [
    `Período: ${report.periodLabel}`,
    report.status === null ? "Situação: todas" : null,
    report.filtersLabel || null,
  ].filter(Boolean)
  const totalValue = report.entries.reduce((sum, item) => sum + rowValue(item, report), 0)
  const totalAmount = report.entries.reduce((sum, item) => sum + item.entry.amount, 0)

  return (
    <Document title={`${report.title} — ${report.organizationName}`} language="pt-BR">
      <Page size="A4" orientation="portrait" style={styles.page}>
        <Text style={styles.orgName}>{report.organizationName}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.count}>
            {count} {count === 1 ? "conta" : "contas"} · gerado em {formatDate(report.generatedAt)}
          </Text>
        </View>
        <Text style={styles.filters}>
          <Text style={styles.filtersStrong}>Filtros: </Text>
          {filters.join(" · ")}
        </Text>
        <View style={styles.rule} />

        {/* Repete no topo de cada página. */}
        <View style={styles.columns} fixed>
          <Text style={col.due}>Vencimento</Text>
          {isPaid && <Text style={col.paidAt}>{config.paymentColumnLabel}</Text>}
          <Text style={col.contact}>{config.contactLabel} · descrição</Text>
          <Text style={col.marker}>Marcador</Text>
          {report.status === null && <Text style={col.status}>Situação</Text>}
          <Text style={col.amount}>Valor</Text>
          <Text style={col.value}>{valueLabel}</Text>
        </View>

        {count === 0 && <Text style={styles.empty}>Nenhuma conta com esses filtros.</Text>}

        {report.entries.map((item, index) => (
          <EntryRow key={item.entry.id} item={item} index={index} report={report} />
        ))}

        {count > 0 && (
          <View style={styles.totals} wrap={false}>
            <Text style={{ flex: 1 }}>
              Total · {count} {count === 1 ? "conta" : "contas"}
            </Text>
            <Text style={col.amount}>{formatBRL(totalAmount)}</Text>
            <Text style={col.value}>{formatBRL(totalValue)}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {report.organizationName} · {report.title}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
