// O recibo de um recebimento/pagamento (uma Settlement), renderizado no
// servidor (react-pdf) pela rota receipts/[id] — como o extrato do
// favorecido. O valor é o efetivamente movimentado (com juros e multa, menos
// desconto); o vínculo com o extrato bancário não sai aqui, é informação
// interna.
import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { amountInWords } from "@/lib/amount-in-words"
import { formatDocument, onlyDigits } from "@/lib/document"
import { formatBRL, formatDate } from "@/lib/format"
import { capiHex, printNeutral } from "@/lib/print-palette"
import { netSettledAmount } from "@/modules/settlements/domain"
import type { SettlementReceipt } from "@/modules/settlements/types"

// Sem hifenização: o react-pdf quebra em inglês e partia nomes próprios e a
// descrição do lançamento no meio ("TRIA-GEN").
Font.registerHyphenationCallback((word) => [word])

const ink = capiHex.black
const { soft, line } = printNeutral

const styles = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 40, paddingHorizontal: 48, fontFamily: "Helvetica", fontSize: 10.5, color: ink },
  accent: { height: 5, backgroundColor: capiHex.purpleDark, marginHorizontal: -48, marginBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orgName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  orgDocument: { fontSize: 9, color: soft, marginTop: 3 },
  kind: { fontSize: 12, color: capiHex.purple, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 2, textAlign: "right" },
  number: { fontSize: 9, color: soft, marginTop: 3, textAlign: "right" },
  amountPanel: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: capiHex.lilacLight,
    borderLeftWidth: 3,
    borderLeftColor: capiHex.purple,
  },
  amountLabel: { fontSize: 8, color: soft, textTransform: "uppercase", letterSpacing: 0.8 },
  amount: { fontSize: 26, fontFamily: "Helvetica-Bold", color: capiHex.purpleDark, marginTop: 4 },
  body: { marginTop: 24, lineHeight: 1.6 },
  bold: { fontFamily: "Helvetica-Bold" },
  breakdown: { marginTop: 20, borderTopWidth: 0.75, borderTopColor: line },
  breakdownTitle: { fontSize: 8, color: soft, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 10, marginBottom: 4 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3, fontSize: 9.5 },
  breakdownTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 5, marginTop: 3, borderTopWidth: 0.75, borderTopColor: line, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  place: { marginTop: 36 },
  signature: { marginTop: 56, width: 260 },
  signatureLine: { borderTopWidth: 0.75, borderTopColor: ink, marginBottom: 6 },
  signatureName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  signatureDocument: { fontSize: 9, color: soft, marginTop: 2 },
  footer: { position: "absolute", bottom: 22, left: 48, right: 48, fontSize: 7.5, color: soft, flexDirection: "row", justifyContent: "space-between" },
})

interface Party {
  name: string
  document: string | null
}

function documentLabel(document: string): string {
  return onlyDigits(document).length === 14 ? "CNPJ" : "CPF"
}

/** "CPF 000.000.000-00" — ou um espaço para preencher à mão, se não houver documento cadastrado. */
function documentText(party: Party): string {
  return party.document ? `${documentLabel(party.document)} ${formatDocument(party.document)}` : "CPF/CNPJ ____________________"
}

function longDate(date: Date): string {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function SettlementReceiptPdf({
  receipt,
  organization,
  generatedAt,
}: {
  receipt: SettlementReceipt
  organization: Party
  generatedAt: Date
}) {
  const isReceivable = receipt.entryType === "RECEIVABLE"
  const contact: Party = { name: receipt.contactName, document: receipt.contactDocument }
  // Num a receber a organização recebe do cliente e assina; num a pagar, quem
  // recebe — e assina — é o fornecedor.
  const payer = isReceivable ? contact : organization
  const payee = isReceivable ? organization : contact

  const total = netSettledAmount(receipt)
  const hasAdjustments = receipt.interest > 0 || receipt.fine > 0 || receipt.discount > 0
  // A rota sempre emite antes de renderizar, então o número já existe.
  const number = receipt.number ?? "—"

  return (
    <Document title={`Recibo ${number} - ${payer.name}`} language="pt-BR">
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} fixed />

        <View style={styles.header}>
          <View>
            <Text style={styles.orgName}>{payee.name}</Text>
            {payee.document && <Text style={styles.orgDocument}>{documentText(payee)}</Text>}
          </View>
          <View>
            <Text style={styles.kind}>Recibo</Text>
            <Text style={styles.number}>Nº {number}</Text>
          </View>
        </View>

        <View style={styles.amountPanel}>
          <Text style={styles.amountLabel}>{isReceivable ? "Valor recebido" : "Valor pago"}</Text>
          <Text style={styles.amount}>{formatBRL(total)}</Text>
        </View>

        <Text style={styles.body}>
          Recebemos de <Text style={styles.bold}>{payer.name}</Text>, {documentText(payer)}, a quantia de{" "}
          <Text style={styles.bold}>{formatBRL(total)}</Text> ({amountInWords(total)}), referente a{" "}
          <Text style={styles.bold}>{receipt.entryDescription}</Text>
          {receipt.installment && (
            <>
              , parcela <Text style={styles.bold}>{receipt.installment}</Text>
            </>
          )}
          , com vencimento em <Text style={styles.bold}>{formatDate(receipt.entryDueDate)}</Text>, pago em{" "}
          <Text style={styles.bold}>{formatDate(receipt.settledAt)}</Text>. Pelo que damos plena quitação deste valor.
        </Text>

        {hasAdjustments && (
          <View style={styles.breakdown} wrap={false}>
            <Text style={styles.breakdownTitle}>Composição do valor</Text>
            <View style={styles.breakdownRow}>
              <Text>Valor original</Text>
              <Text>{formatBRL(receipt.settledAmount)}</Text>
            </View>
            {receipt.interest + receipt.fine > 0 && (
              <View style={styles.breakdownRow}>
                <Text>Juros e Multa</Text>
                <Text>+ {formatBRL(receipt.interest + receipt.fine)}</Text>
              </View>
            )}
            {receipt.discount > 0 && (
              <View style={styles.breakdownRow}>
                <Text>Desconto</Text>
                <Text>- {formatBRL(receipt.discount)}</Text>
              </View>
            )}
            <View style={styles.breakdownTotal}>
              <Text>Total</Text>
              <Text>{formatBRL(total)}</Text>
            </View>
          </View>
        )}

        <Text style={styles.place}>____________________________, {longDate(receipt.settledAt)}.</Text>

        <View style={styles.signature} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureName}>{payee.name}</Text>
          <Text style={styles.signatureDocument}>{documentText(payee)}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Recibo Nº {number}</Text>
          <Text>Emitido em {formatDate(generatedAt)} pelo Capi</Text>
        </View>
      </Page>
    </Document>
  )
}
