// O PDF do extrato do favorecido, renderizado no servidor (react-pdf) pela
// rota reports/beneficiary-statement/pdf — a prestação de contas que se manda
// para ele. Cores fixas e claras, como o relatório de contas. As linhas saem
// em ordem cronológica (mais antiga em cima), como num extrato bancário.
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"

import { formatBRL, formatDate } from "@/lib/format"
import { capiHex, printNeutral } from "@/lib/print-palette"
import type { StatementSlice } from "@/modules/payouts/statement"
import type { BeneficiaryStatement, BeneficiaryStatementLine } from "@/modules/payouts/types"

const ink = capiHex.black
const { soft, line, zebra } = printNeutral
const positive = "#15803d"

const styles = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 40, paddingHorizontal: 32, fontFamily: "Helvetica", fontSize: 9, color: ink },
  orgName: { fontSize: 8, color: soft, textTransform: "uppercase", letterSpacing: 0.6 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 9, color: soft, marginTop: 3 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: ink, marginTop: 10, marginBottom: 8 },
  summary: { flexDirection: "row", borderWidth: 0.75, borderColor: line, marginBottom: 10 },
  summaryCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 8 },
  summaryLabel: { fontSize: 7.5, color: soft, textTransform: "uppercase" },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
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
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.75, borderBottomColor: line },
  openingRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 0.75, borderBottomColor: line, color: soft },
  bold: { fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 8, color: soft, marginTop: 1 },
  pageNumber: { position: "absolute", bottom: 18, left: 32, right: 32, fontSize: 7.5, color: soft, flexDirection: "row", justifyContent: "space-between" },
})

const col = {
  date: { width: 58 },
  due: { width: 58 },
  description: { flex: 1, paddingRight: 8 },
  amount: { width: 80, textAlign: "right" as const },
  balance: { width: 80, textAlign: "right" as const },
}

function statusLabel(entry: BeneficiaryStatementLine): string {
  if (entry.kind === "CREDIT") return entry.installmentLabel ?? ""
  return entry.status === "REALIZED" ? "Realizado" : "Pendente"
}

function periodText(from: Date | null, to: Date | null): string {
  if (from && to) return `${formatDate(from)} a ${formatDate(to)}`
  if (from) return `a partir de ${formatDate(from)}`
  if (to) return `até ${formatDate(to)}`
  return "Todo o período"
}

export function BeneficiaryStatementPdf({
  organizationName,
  statement,
  slice,
  from,
  to,
  generatedAt,
}: {
  organizationName: string
  statement: BeneficiaryStatement
  slice: StatementSlice
  from: Date | null
  to: Date | null
  generatedAt: Date
}) {
  const { lines } = slice
  const meta = [statement.document, periodText(from, to), `gerado em ${formatDate(generatedAt)}`]
    .filter(Boolean)
    .join(" · ")

  return (
    <Document title={`Extrato - ${statement.name}`} language="pt-BR">
      <Page size="A4" style={styles.page}>
        <Text style={styles.orgName}>{organizationName}</Text>
        <Text style={styles.title}>Extrato - {statement.name}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.rule} />

        <View style={styles.summary}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Saldo anterior</Text>
            <Text style={styles.summaryValue}>{formatBRL(slice.openingBalance)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Recebimentos</Text>
            <Text style={[styles.summaryValue, { color: positive }]}>{formatBRL(slice.credits)}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Repasses</Text>
            <Text style={[styles.summaryValue, { color: capiHex.red }]}>
              {slice.debits > 0 ? "- " : ""}
              {formatBRL(slice.debits)}
            </Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Saldo final</Text>
            <Text style={styles.summaryValue}>{formatBRL(slice.closingBalance)}</Text>
          </View>
        </View>

        {/* Repete no topo de cada página. */}
        <View style={styles.columns} fixed>
          <Text style={col.date}>Data</Text>
          <Text style={col.description}>Descrição</Text>
          <Text style={col.due}>Vencimento</Text>
          <Text style={col.amount}>Valor</Text>
          <Text style={col.balance}>Saldo</Text>
        </View>

        <View style={styles.openingRow} wrap={false}>
          <Text style={col.date}>{from ? formatDate(from) : ""}</Text>
          <Text style={col.description}>Saldo anterior</Text>
          <Text style={col.due} />
          <Text style={col.amount} />
          <Text style={[col.balance, styles.bold, { color: ink }]}>{formatBRL(slice.openingBalance)}</Text>
        </View>

        {lines.map((entry, index) => (
          <View key={entry.id} wrap={false} style={[styles.row, index % 2 === 1 ? { backgroundColor: zebra } : {}]}>
            <Text style={col.date}>{formatDate(entry.date)}</Text>
            <View style={col.description}>
              <Text style={styles.bold}>
                {entry.title}
                {statusLabel(entry) ? `  ·  ${statusLabel(entry)}` : ""}
              </Text>
              <Text style={styles.sub}>{entry.description}</Text>
            </View>
            <Text style={col.due}>{formatDate(entry.dueDate)}</Text>
            <Text style={[col.amount, styles.bold, { color: entry.amount >= 0 ? positive : capiHex.red }]}>
              {entry.amount >= 0 ? "" : "- "}
              {formatBRL(Math.abs(entry.amount))}
            </Text>
            <Text style={col.balance}>{formatBRL(entry.balance)}</Text>
          </View>
        ))}

        {lines.length === 0 && (
          <Text style={{ marginTop: 24, textAlign: "center", color: soft }}>Nenhum movimento neste período.</Text>
        )}

        <View style={styles.pageNumber} fixed>
          <Text>
            {organizationName} · Extrato - {statement.name}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
