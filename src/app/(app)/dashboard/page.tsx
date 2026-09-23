import { ChartCashFlow } from "@/components/charts/chart-cash-flow"
import { ReceivableCard } from "@/components/receivable-card"
import { formatBRL } from "@/lib/format"
import { contaBancaria, saldoTotal } from "@/lib/mock/dashboard"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { getPayablesSummary, getReceivablesSummary } from "@/modules/dashboard/service"
import { ArrowDownRightIcon, ArrowUpRightIcon, Building2Icon } from "lucide-react"

export default async function DashboardPage() {
  const session = await requireSessionOrRedirect()
  const [contasAReceber, contasAPagar] = await Promise.all([
    getReceivablesSummary(session.organizationId),
    getPayablesSummary(session.organizationId),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(260px,300px)_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2Icon className="size-4" />
              Contas bancárias
            </div>
            <a href="#" className="text-[12.5px] font-medium text-primary hover:underline">
              Ver todas →
            </a>
          </div>
          <div>
            <p className="text-[12.5px] text-muted-foreground">Saldo total</p>
            <p className="mt-1 text-[28px] leading-none font-bold tracking-tight">{formatBRL(saldoTotal)}</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-[10px] bg-muted px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{contaBancaria.nome}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Ag {contaBancaria.agencia} / CC {contaBancaria.conta}
                </p>
              </div>
              <span className="text-sm font-medium">{formatBRL(contaBancaria.saldoInicial)}</span>
            </div>
            <a href="#" className="inline-block text-sm font-medium text-primary hover:underline">
              + Adicionar conta
            </a>
          </div>
        </div>

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
    </div>
  )
}
