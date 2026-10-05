// O PDF do relatório de contas, renderizado no servidor (react-pdf) pela rota
// reports/accounts/pdf. Cores fixas e claras — não herda o tema da tela — e
// um bloco por lançamento: a linha de cima só com campos curtos, e a
// descrição e a observação embaixo na largura toda, para que descrição longa
// não estique a linha.
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { kindConfig } from "@/lib/accounts/labels"
import { NO_BENEFICIARY_LABEL, type AccountsReport, type ReportEntry } from "@/lib/accounts/report"
import { formatBRL, formatDate } from "@/lib/format"
import { markerPrintColor } from "@/lib/marker-colors"

const ink = "#111827"
const soft = "#4b5563"
const line = "#d1d5db"
const zebra = "#f6f7f9"

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, color: ink },
  orgName: { fontSize: 8, color: soft, textTransform: "uppercase", letterSpacing: 0.6 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 9, color: soft, marginTop: 3 },
  headerTotalLabel: { fontSize: 8, color: soft, textAlign: "right" },
  headerTotal: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "right" },
  rule: { borderBottomWidth: 1.5, borderBottomColor: ink, marginTop: 10, marginBottom: 4 },
  columns: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: line,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: soft,
    textTransform: "uppercase",
  },
  group: { marginTop: 12 },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: ink,
    color: "#ffffff",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  groupName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  groupMeta: { fontSize: 9 },
  entry: { paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.75, borderBottomColor: line },
  row: { flexDirection: "row", alignItems: "flex-start" },
  description: { marginTop: 2, color: soft, fontSize: 8.5 },
  note: {
    marginTop: 3,
    paddingLeft: 5,
    paddingVertical: 1,
    borderLeftWidth: 2,
    borderLeftColor: ink,
    fontSize: 8.5,
  },
  bold: { fontFamily: "Helvetica-Bold" },
  marker: { marginTop: 2, alignSelf: "flex-start", borderRadius: 3, borderWidth: 0.75, paddingHorizontal: 4, paddingVertical: 1, fontSize: 7.5 },
  subtotal: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 4, paddingHorizontal: 6, fontSize: 9 },
  footer: {
    marginTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: ink,
    paddingTop: 8,
    alignItems: "flex-end",
  },
  grandTotal: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  grandMeta: { fontSize: 8.5, color: soft, marginTop: 2 },
  pageNumber: { position: "absolute", bottom: 18, left: 32, right: 32, fontSize: 7.5, color: soft, flexDirection: "row", justifyContent: "space-between" },
})

// Larguras das colunas da linha de cima; Cliente e Categoria dividem o resto.
const col = {
  due: { width: 58 },
  paid: { width: 64 },
  contact: { flex: 2, paddingRight: 6 },
  category: { flex: 1.3, paddingRight: 6 },
  amount: { width: 76, textAlign: "right" as const },
  open: { width: 80, textAlign: "right" as const },
  status: { width: 118, paddingLeft: 10 },
}

function EntryBlock({ item, index, report }: { item: ReportEntry; index: number; report: AccountsReport }) {
  const { entry } = item
  const config = kindConfig[report.kind]
  const description = entry.installment ? `${entry.installment} · ${entry.description}` : entry.description
  const marker = entry.marker ? markerPrintColor(entry.marker.color) : null
  return (
    <View wrap={false} style={[styles.entry, index % 2 === 1 ? { backgroundColor: zebra } : {}]}>
      <View style={styles.row}>
        <Text style={col.due}>{formatDate(entry.dueDate)}</Text>
        <Text style={[col.paid, { color: soft }]}>{entry.paidAt ? formatDate(entry.paidAt) : config.emptyPaymentDate}</Text>
        <Text style={[col.contact, styles.bold]}>{entry.contactName}</Text>
        <Text style={[col.category, { color: soft }]}>{entry.categoryName}</Text>
        <Text style={col.amount}>{formatBRL(entry.amount)}</Text>
        <Text style={[col.open, styles.bold]}>{formatBRL(item.openAmount)}</Text>
        <View style={col.status}>
          <Text style={item.status === "OVERDUE" ? [styles.bold, { color: "#b91c1c" }] : {}}>{item.statusLabel}</Text>
          {entry.marker && marker && (
            <Text style={[styles.marker, { color: marker.text, backgroundColor: marker.background, borderColor: marker.text }]}>
              {entry.marker.name}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.description}>
        {description}
        {item.sharedWith.length > 0 ? `  (dividido com ${item.sharedWith.join(", ")})` : ""}
      </Text>
      {entry.notes && (
        <Text style={styles.note}>
          <Text style={styles.bold}>Obs.{entry.notesUpdatedAt ? ` (${formatDate(entry.notesUpdatedAt)})` : ""}: </Text>
          {entry.notes}
        </Text>
      )}
    </View>
  )
}

export function AccountsReportPdf({ report }: { report: AccountsReport }) {
  const config = kindConfig[report.kind]
  const meta = [report.periodLabel, report.filtersLabel, `gerado em ${formatDate(report.generatedAt)}`]
    .filter(Boolean)
    .join(" · ")
  return (
    <Document title={`${report.title} — ${report.organizationName}`} language="pt-BR">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orgName}>{report.organizationName}</Text>
            <Text style={styles.title}>{report.title}</Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
          <View>
            <Text style={styles.headerTotalLabel}>Total em aberto</Text>
            <Text style={styles.headerTotal}>{formatBRL(report.totals.open)}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        {/* Repete no topo de cada página. */}
        <View style={styles.columns} fixed>
          <Text style={col.due}>Vencimento</Text>
          <Text style={col.paid}>{config.paymentColumnLabel}</Text>
          <Text style={col.contact}>{config.contactLabel}</Text>
          <Text style={col.category}>Categoria</Text>
          <Text style={col.amount}>Total</Text>
          <Text style={col.open}>{config.amountColumnLabel}</Text>
          <Text style={col.status}>Situação</Text>
        </View>

        {report.groups.length === 0 && (
          <Text style={{ marginTop: 24, textAlign: "center", color: soft }}>Nenhum lançamento neste filtro.</Text>
        )}

        {report.groups.map((group) => (
          <View key={group.name} style={styles.group}>
            {/* fixed dentro da seção: repete no topo de cada página que ela ocupa. minPresenceAhead: não fica sozinho no pé da página. */}
            <View style={styles.groupHeader} minPresenceAhead={60} fixed>
              <Text style={styles.groupName}>
                {group.name === NO_BENEFICIARY_LABEL ? group.name : `${report.groupLabel}: ${group.name}`}
              </Text>
              <Text style={styles.groupMeta}>
                {group.entries.length} {group.entries.length === 1 ? "lançamento" : "lançamentos"} ·{" "}
                {formatBRL(group.openTotal)} em aberto
              </Text>
            </View>
            {group.entries.map((item, index) => (
              <EntryBlock key={item.entry.id} item={item} index={index} report={report} />
            ))}
            <View style={styles.subtotal} wrap={false}>
              <Text>
                Subtotal em aberto — {group.name}: <Text style={styles.bold}>{formatBRL(group.openTotal)}</Text>
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.footer} wrap={false}>
          <Text style={styles.grandTotal}>TOTAL EM ABERTO: {formatBRL(report.totals.open)}</Text>
          <Text style={styles.grandMeta}>
            {report.totals.count} {report.totals.count === 1 ? "lançamento" : "lançamentos"} · Total{" "}
            {formatBRL(report.totals.amount)} · {config.summaryPaidLabel} {formatBRL(report.totals.settled)}
          </Text>
        </View>

        <View style={styles.pageNumber} fixed>
          <Text>
            {report.organizationName} · {report.title}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
