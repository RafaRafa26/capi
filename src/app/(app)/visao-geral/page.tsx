import { ChartCashFlow } from "@/components/charts/chart-cash-flow"
import { ChartMonthlyReceipts } from "@/components/charts/chart-monthly-receipts"
import { ReceivableCard } from "@/components/receivable-card"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatBRL } from "@/lib/format"
import {
  contaBancaria,
  contasAPagar,
  contasAReceber,
  saldoTotal,
} from "@/lib/mock/dashboard"
import { ArrowDownRightIcon, ArrowUpRightIcon, Building2Icon } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,340px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2Icon className="size-4" />
              Contas bancárias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Saldo total:</p>
              <p className="text-2xl font-semibold">{formatBRL(saldoTotal)}</p>
            </div>
            <a href="#" className="inline-block text-sm font-medium text-primary hover:underline">
              Ver todas →
            </a>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{contaBancaria.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Ag {contaBancaria.agencia} / CC {contaBancaria.conta}
                  </p>
                </div>
                <span className="font-medium">
                  {formatBRL(contaBancaria.saldoInicial)}
                </span>
              </div>
              <a href="#" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                + Adicionar conta
              </a>
            </div>
          </CardContent>
        </Card>

        <ChartCashFlow />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReceivableCard
          title="Contas a receber"
          icon={<ArrowUpRightIcon className="size-4" />}
          resumo={contasAReceber}
        />
        <ReceivableCard
          title="Contas a pagar"
          icon={<ArrowDownRightIcon className="size-4" />}
          resumo={contasAPagar}
        />
      </div>

      <ChartMonthlyReceipts />
    </div>
  )
}
