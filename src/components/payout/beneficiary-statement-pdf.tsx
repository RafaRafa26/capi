// O PDF do extrato do favorecido, renderizado no servidor (react-pdf) pela
// rota reports/beneficiary-statement/pdf — a prestação de contas que se manda
// para ele. Mesma identidade do extrato da conta e do recibo: faixa roxa no
// topo, painel lilás com os saldos, cores fixas e claras. As linhas saem em
// ordem cronológica (mais antiga em cima), como num extrato bancário.
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { addDays, format, isSameMonth, isSameYear, lastDayOfMonth, startOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"

import { formatDocument, onlyDigits } from "@/lib/document"
import { formatBRL, formatDate } from "@/lib/format"
import { capiHex, markerPrintHex, printNeutral } from "@/lib/print-palette"
import type { StatementSlice } from "@/modules/payouts/statement"
import type { BeneficiaryStatement, BeneficiaryStatementLine } from "@/modules/payouts/types"

// Sem hifenização: o react-pdf quebra em inglês e partia nomes próprios no meio.
Font.registerHyphenationCallback((word) => [word])

const ink = capiHex.black
const { soft, line, zebra } = printNeutral
const positive = "#15803d"
const scheduled = markerPrintHex.amber

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 44, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9, color: ink },
  accent: { height: 5, backgroundColor: capiHex.purpleDark, marginHorizontal: -40, marginBottom: 26 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 8.5, color: soft, marginTop: 3 },
  label: { fontFamily: "Helvetica-Bold", color: capiHex.purple },
  kind: { fontSize: 12, color: capiHex.purple, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 2, textAlign: "right" },
  kindSub: { fontSize: 9, color: soft, marginTop: 3, textAlign: "right" },

  beneficiaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 8,
    borderTopWidth: 0.75,
    borderTopColor: line,
    borderBottomWidth: 0.75,
    borderBottomColor: line,
    fontSize: 8.5,
  },
  beneficiaryName: { fontSize: 12, fontFamily: "Helvetica-Bold" },

  panel: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: capiHex.lilacLight,
    borderLeftWidth: 3,
    borderLeftColor: capiHex.purple,
  },
  panelCell: { flex: 1, paddingVertical: 11, paddingHorizontal: 14 },
  panelLabel: { fontSize: 7.5, color: soft, textTransform: "uppercase", letterSpacing: 0.8 },
  panelValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 4 },
  panelFinal: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 3, color: capiHex.purpleDark },

  table: { marginTop: 18 },
  columns: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: capiHex.lilacLight,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: capiHex.purple,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: line },
  openingRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: line, color: soft },
  totalRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: ink,
    backgroundColor: capiHex.lilacLight,
    fontFamily: "Helvetica-Bold",
  },
  titleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  tag: { fontSize: 6.5, color: soft, borderWidth: 0.5, borderColor: line, borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginLeft: 5 },
  tagScheduled: { color: scheduled.text, borderColor: scheduled.text },
  sub: { fontSize: 7.5, color: soft, marginTop: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  empty: { marginTop: 24, textAlign: "center", color: soft },
  legend: { marginTop: 8, fontSize: 7.5, color: soft },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: line,
    fontSize: 7.5,
    color: soft,
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

const col = {
  date: { width: 62 },
  description: { flex: 1, paddingRight: 10 },
  amount: { width: 84, textAlign: "right" as const },
  balance: { width: 84, textAlign: "right" as const },
}

function signedBRL(amount: number): string {
  return `${amount < 0 ? "- " : "+ "}${formatBRL(Math.abs(amount))}`
}

/** "1 a 30 de novembro de 2026" no mesmo mês; "15/10/2026 a 14/11/2026" quando atravessa meses. */
function periodText(from: Date, to: Date): string {
  if (isSameMonth(from, to)) return `${format(from, "d")} a ${format(to, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
  if (isSameYear(from, to)) {
    return `${format(from, "d 'de' MMMM", { locale: ptBR })} a ${format(to, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
  }
  return `${formatDate(from)} a ${formatDate(to)}`
}

/** O mês por extenso quando o período é exatamente um mês fechado; senão, nada. */
function wholeMonth(from: Date, to: Date): string | null {
  const isWholeMonth =
    isSameMonth(from, to) &&
    from.getDate() === startOfMonth(from).getDate() &&
    to.getDate() === lastDayOfMonth(to).getDate()
  return isWholeMonth ? format(from, "MMMM 'de' yyyy", { locale: ptBR }) : null
}

function isScheduled(entry: BeneficiaryStatementLine): boolean {
  return entry.kind === "DEBIT" && entry.status === "PENDING"
}

export function BeneficiaryStatementPdf({
  organizationName,
  organizationDocument,
  statement,
  slice,
  from,
  to,
  generatedAt,
}: {
  organizationName: string
  organizationDocument: string | null
  statement: BeneficiaryStatement
  slice: StatementSlice
  from: Date | null
  to: Date | null
  generatedAt: Date
}) {
  const { lines } = slice
  const title = `Extrato de ${statement.name}`

  // "Todo o período" não tem datas: usa as do primeiro e do último movimento,
  // para o cabeçalho e os rótulos dos saldos sempre dizerem de quando são.
  const periodFrom = from ?? lines[0]?.date ?? generatedAt
  const periodTo = to ?? lines.at(-1)?.date ?? generatedAt
  const month = wholeMonth(periodFrom, periodTo)
  const openingDate = from ? addDays(from, -1) : null
  const openingLabel = openingDate ? `Saldo em ${format(openingDate, "dd/MM")}` : "Saldo inicial"

  return (
    <Document title={title} language="pt-BR">
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} fixed />

        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{organizationName}</Text>
            {organizationDocument ? (
              <Text style={styles.orgLine}>
                <Text style={styles.label}>{onlyDigits(organizationDocument).length === 14 ? "CNPJ " : "CPF "}</Text>
                {formatDocument(organizationDocument)}
              </Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.kind}>Extrato do favorecido</Text>
            {month ? <Text style={styles.kindSub}>{month}</Text> : null}
          </View>
        </View>

        <View style={styles.beneficiaryRow}>
          <Text>
            <Text style={styles.label}>Favorecido </Text>
            <Text style={styles.beneficiaryName}>{statement.name}</Text>
          </Text>
          <Text>
            <Text style={styles.label}>Período </Text>
            {periodText(periodFrom, periodTo)}
            {"   ·   "}
            <Text style={styles.label}>Gerado em </Text>
            {format(generatedAt, "dd/MM/yyyy 'às' HH:mm")}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>{openingLabel}</Text>
            <Text style={styles.panelValue}>{formatBRL(slice.openingBalance)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Recebimentos</Text>
            <Text style={styles.panelValue}>{formatBRL(slice.credits)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Repasses</Text>
            <Text style={styles.panelValue}>{formatBRL(slice.debits)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Saldo</Text>
            <Text style={styles.panelFinal}>{formatBRL(slice.closingBalance)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          {/* Repete no topo de cada página. */}
          <View style={styles.columns} fixed>
            <Text style={col.date}>Data</Text>
            <Text style={col.description}>Movimentação</Text>
            <Text style={col.amount}>Valor</Text>
            <Text style={col.balance}>Saldo</Text>
          </View>

          {/* Sem data inicial o extrato começa do zero: a linha não diria nada. */}
          {openingDate ? (
            <View style={styles.openingRow} wrap={false}>
              <Text style={col.date}>{formatDate(openingDate)}</Text>
              <Text style={col.description}>Saldo anterior</Text>
              <Text style={col.amount} />
              <Text style={[col.balance, styles.bold, { color: ink }]}>{formatBRL(slice.openingBalance)}</Text>
            </View>
          ) : null}

          {lines.map((entry, index) => {
            const pending = isScheduled(entry)
            const tag = entry.kind === "CREDIT" ? entry.installmentLabel : pending ? "Agendado" : null
            const sub =
              entry.kind === "CREDIT"
                ? [entry.description, `vencimento ${format(entry.dueDate, "dd/MM")}`].filter(Boolean).join(" · ")
                : entry.description
            return (
              <View
                key={entry.id}
                wrap={false}
                style={[
                  styles.row,
                  pending ? { backgroundColor: scheduled.background } : index % 2 === 1 ? { backgroundColor: zebra } : {},
                ]}
              >
                <Text style={col.date}>{formatDate(entry.date)}</Text>
                <View style={col.description}>
                  <View style={styles.titleLine}>
                    <Text style={styles.title}>{entry.title}</Text>
                    {tag ? <Text style={[styles.tag, pending ? styles.tagScheduled : {}]}>{tag}</Text> : null}
                  </View>
                  {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                </View>
                <Text style={[col.amount, styles.bold, { color: entry.amount >= 0 ? positive : capiHex.red }]}>
                  {signedBRL(entry.amount)}
                </Text>
                <Text style={col.balance}>{formatBRL(entry.balance)}</Text>
              </View>
            )
          })}

          {lines.length === 0 ? (
            <Text style={styles.empty}>Nenhum movimento neste período.</Text>
          ) : (
            <View style={styles.totalRow} wrap={false}>
              <Text style={col.date} />
              <Text style={col.description}>Saldo em {formatDate(periodTo)}</Text>
              <Text style={col.amount}>{signedBRL(slice.closingBalance - slice.openingBalance)}</Text>
              <Text style={col.balance}>{formatBRL(slice.closingBalance)}</Text>
            </View>
          )}
        </View>

        {lines.length > 0 && (
          <Text style={styles.legend}>
            Valores com + são recebimentos (sua parte do valor pago pelo cliente); com -, repasses ou pagamentos feitos
            por sua conta. Fundo amarelo: repasse agendado, ainda não pago.
          </Text>
        )}

        <View style={styles.footer} fixed>
          <Text>
            {organizationName} · {title} · gerado pelo Capi
          </Text>
          <Text render={({ pageNumber, totalPages }) => `pág. ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
