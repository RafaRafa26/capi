import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format"
import type { BeneficiaryCredit } from "@/modules/payouts/types"

/** As três linhas de um recebimento: quem pagou + parcela, descrição, vencimento e recebimento. */
export function CreditSummary({ credit }: { credit: BeneficiaryCredit }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium" title={credit.payerName}>{credit.payerName}</span>
        <Badge variant="outline" className="shrink-0 font-normal">{credit.installmentLabel}</Badge>
      </p>
      <p className="truncate text-muted-foreground" title={credit.description}>{credit.description}</p>
      <p className="text-xs text-muted-foreground">
        Vencimento {formatDate(credit.dueDate)} · Recebido em {formatDate(credit.settledAt)}
      </p>
    </div>
  )
}
