import { notFound } from "next/navigation"

import { PrintButton } from "@/components/print-button"
import { formatBRL, formatDate } from "@/lib/format"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { getSettlementReceipt } from "@/modules/settlements/service"
import { NotFound } from "@/shared/errors"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  )
}

export default async function ReceiptPage(props: PageProps<"/receipts/[id]">) {
  const { id } = await props.params
  const session = await requireSessionOrRedirect()

  let receipt
  try {
    receipt = await getSettlementReceipt(session.organizationId, id)
  } catch (error) {
    if (error instanceof NotFound) notFound()
    throw error
  }

  const isReceivable = receipt.entryType === "RECEIVABLE"
  const title = isReceivable ? "Recibo de recebimento" : "Recibo de pagamento"
  const partyLabel = isReceivable ? "Recebido de" : "Pago a"

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-160 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Capi</p>
        <PrintButton />
      </div>

      <div className="flex flex-col gap-6 rounded-xl border p-8">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{session.organizationName}</p>
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">Valor</p>
          <p className="text-3xl font-semibold">{formatBRL(receipt.settledAmount)}</p>
        </div>

        <div className="flex flex-col divide-y">
          <Row label={partyLabel} value={receipt.contactName} />
          <Row label="Referente a" value={receipt.entryDescription} />
          {receipt.installment && <Row label="Parcela" value={receipt.installment} />}
          <Row label="Categoria" value={receipt.categoryName} />
          <Row label="Data" value={formatDate(receipt.settledAt)} />
          {receipt.note && <Row label="Identificador" value={receipt.note} />}
          {receipt.interest > 0 && <Row label="Juros" value={formatBRL(receipt.interest)} />}
          {receipt.fine > 0 && <Row label="Multa" value={formatBRL(receipt.fine)} />}
          {receipt.discount > 0 && <Row label="Desconto" value={`− ${formatBRL(receipt.discount)}`} />}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Documento gerado por {session.organizationName} em {formatDate(new Date())}.
        </p>
      </div>
    </div>
  )
}
