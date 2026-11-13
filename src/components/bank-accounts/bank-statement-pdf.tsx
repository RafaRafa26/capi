// O PDF do extrato da conta bancária, renderizado no servidor (react-pdf) pela
// rota reports/bank-statement/pdf — o mês e o filtro (Saldo, Entradas ou
// Saídas) que estão na tela Contas e Extratos. Mesma identidade do recibo:
// faixa roxa no topo, painel lilás com os saldos, cores fixas e claras.
// Linhas em ordem cronológica, mais antiga em cima, como num extrato de banco.
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { statementLineText, statementSeriesLabel, type BankStatementExport } from "@/lib/bank-accounts/statement"
import { formatDocument, onlyDigits } from "@/lib/document"
import { formatBankAccountNumbers, formatBRL, formatDate } from "@/lib/format"
import { capiHex, printNeutral } from "@/lib/print-palette"

// Sem hifenização: o react-pdf quebra em inglês e partia nomes próprios no meio.
Font.registerHyphenationCallback((word) => [word])

const ink = capiHex.black
const { soft, line, zebra } = printNeutral
const positive = "#15803d"

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 44, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 9, color: ink },
  accent: { height: 5, backgroundColor: capiHex.purpleDark, marginHorizontal: -40, marginBottom: 26 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  orgLine: { fontSize: 8.5, color: soft, marginTop: 3 },
  label: { fontFamily: "Helvetica-Bold", color: capiHex.purple },
  kind: { fontSize: 12, color: capiHex.purple, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 2, textAlign: "right" },
  kindSub: { fontSize: 9, color: soft, marginTop: 3, textAlign: "right" },

  periodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingBottom: 8,
    borderBottomWidth: 0.75,
    borderBottomColor: line,
    fontSize: 8.5,
  },

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
  title: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  sub: { fontSize: 7.5, color: soft, marginTop: 2 },
  empty: { marginTop: 24, textAlign: "center", color: soft },

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

function longDate(date: Date): string {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function signedBRL(amount: number): string {
  return `${amount < 0 ? "- " : ""}${formatBRL(Math.abs(amount))}`
}

export function BankStatementPdf({
  organizationName,
  organizationDocument,
  bankAccount,
  month,
  series,
  view,
  generatedAt,
}: BankStatementExport) {
  const title = `Extrato - ${bankAccount.name}`
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const numbers = formatBankAccountNumbers(bankAccount)

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
            <Text style={styles.orgLine}>
              <Text style={styles.label}>Conta </Text>
              {[bankAccount.name, bankAccount.bank, numbers].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <View>
            <Text style={styles.kind}>Extrato</Text>
            <Text style={styles.kindSub}>{format(month, "MMMM 'de' yyyy", { locale: ptBR })}</Text>
            {series !== "saldo" ? (
              <Text style={styles.kindSub}>Somente {statementSeriesLabel[series].toLowerCase()}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.periodRow}>
          <Text>
            <Text style={styles.label}>Período </Text>
            {longDate(monthStart)} a {longDate(monthEnd)}
          </Text>
          <Text>
            <Text style={styles.label}>Gerado em </Text>
            {format(generatedAt, "dd/MM/yyyy 'às' HH:mm")}
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Saldo inicial</Text>
            <Text style={styles.panelValue}>{formatBRL(view.openingBalance)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Entradas</Text>
            <Text style={[styles.panelValue, { color: positive }]}>{formatBRL(view.entradas)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Saídas</Text>
            <Text style={[styles.panelValue, { color: capiHex.red }]}>{signedBRL(-view.saidas)}</Text>
          </View>
          <View style={styles.panelCell}>
            <Text style={styles.panelLabel}>Saldo final</Text>
            <Text style={styles.panelFinal}>{formatBRL(view.closingBalance)}</Text>
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

          <View style={styles.openingRow} wrap={false}>
            <Text style={col.date}>{formatDate(view.openingDate)}</Text>
            <Text style={col.description}>Saldo anterior</Text>
            <Text style={col.amount} />
            <Text style={[col.balance, { fontFamily: "Helvetica-Bold", color: ink }]}>{formatBRL(view.openingBalance)}</Text>
          </View>

          {view.lines.map((statementLine, index) => {
            const text = statementLineText(statementLine)
            const sub = [text.contacts, text.bankDescription && `Banco: ${text.bankDescription}`].filter(Boolean).join("  ·  ")
            return (
              <View
                key={statementLine.id}
                wrap={false}
                style={[styles.row, index % 2 === 1 ? { backgroundColor: zebra } : {}]}
              >
                <Text style={col.date}>{formatDate(statementLine.date)}</Text>
                <View style={col.description}>
                  <Text style={styles.title}>{text.title}</Text>
                  {sub ? <Text style={styles.sub}>{sub}</Text> : null}
                </View>
                <Text
                  style={[
                    col.amount,
                    { fontFamily: "Helvetica-Bold", color: statementLine.amount >= 0 ? positive : capiHex.red },
                  ]}
                >
                  {signedBRL(statementLine.amount)}
                </Text>
                <Text style={col.balance}>{formatBRL(statementLine.runningBalance)}</Text>
              </View>
            )
          })}

          {view.lines.length === 0 && (
            <Text style={styles.empty}>
              {series === "entradas"
                ? "Nenhuma entrada neste mês."
                : series === "saidas"
                  ? "Nenhuma saída neste mês."
                  : "Nenhuma movimentação neste mês."}
            </Text>
          )}
        </View>

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
