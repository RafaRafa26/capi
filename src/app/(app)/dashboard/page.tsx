import { Landmark, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import {
  fluxoDeCaixaDiario,
  recebimentosPorMes,
  resumoDoDashboard,
  type ResumoPorSituacao,
} from "@/modules/dashboard/servico";

const toneDot: Record<string, string> = {
  destructive: "bg-[#e5484d]",
  warning: "bg-[#f76b15]",
  muted: "bg-muted-foreground",
};

const toneBadge: Record<string, string> = {
  destructive: "bg-[#fff5f5] text-[#e5484d]",
  warning: "bg-[#fff7ed] text-[#f76b15]",
  muted: "bg-muted text-muted-foreground",
};

function linhasDe(resumo: ResumoPorSituacao) {
  return [
    { label: "Vencido", ...resumo.vencido, tone: "destructive" },
    { label: "Vence hoje", ...resumo.venceHoje, tone: "warning" },
    { label: "A vencer", ...resumo.aVencer, tone: "muted" },
  ];
}

function PayRecCard({
  title,
  icon: Icon,
  resumo,
  href,
}: {
  title: string;
  icon: typeof TrendingUp;
  resumo: ResumoPorSituacao;
  href: string;
}) {
  return (
    <div className="bg-card border-border flex flex-1 flex-col gap-4 rounded-xl border p-6 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <Link href={href} className="flex items-center gap-2 hover:underline">
          <Icon className="size-[18px]" />
          <p className="text-sm font-semibold">{title}</p>
        </Link>
        <p className="text-muted-foreground text-[11px]">
          Total: {formatMoney(resumo.total)}
        </p>
      </div>
      <div className="flex w-full flex-col">
        {linhasDe(resumo).map((row) => (
          <div
            key={row.label}
            className="border-border flex w-full items-center justify-between border-b py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className={cn("size-2 rounded-sm", toneDot[row.tone])} />
              <p className="text-sm font-medium">{row.label}</p>
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  toneBadge[row.tone],
                )}
              >
                {row.quantidade} lançamento{row.quantidade === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-sm font-semibold">{formatMoney(row.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [resumo, serieFluxo, meses] = await Promise.all([
    resumoDoDashboard(sessao.organizacaoId),
    fluxoDeCaixaDiario(sessao.organizacaoId),
    recebimentosPorMes(sessao.organizacaoId),
  ]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Visão geral</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-7 p-6 pt-0 md:p-10 md:pt-0">
        <div className="bg-card border-border flex flex-col rounded-xl border shadow-sm md:flex-row">
          <div className="flex w-full flex-col gap-4 p-6 md:w-[360px]">
            <div className="flex items-center gap-2">
              <Landmark className="size-5" />
              <p className="text-sm font-semibold">Contas bancárias</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo total</p>
              <p className="text-3xl font-bold">{formatMoney(resumo.saldoTotal)}</p>
            </div>
            <Link href="/contas-bancarias" className="text-sm font-medium text-[#2563eb]">
              Ver todas →
            </Link>
            <Separator />
            <div className="flex flex-col">
              {resumo.contas.map((conta) => (
                <Link
                  key={conta.id}
                  href={`/contas-bancarias/${conta.id}/extrato`}
                  className="border-border hover:bg-muted/50 flex items-center justify-between border-b py-3 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{conta.nome}</p>
                    <p className="text-muted-foreground text-xs">
                      Ag {conta.agencia} / CC {conta.conta}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{formatMoney(conta.saldo)}</p>
                </Link>
              ))}
              {resumo.contas.length === 0 ? (
                <p className="text-muted-foreground py-3 text-sm">
                  Nenhuma conta própria cadastrada.
                </p>
              ) : null}
            </div>
            <Link href="/contas-bancarias/novo" className="text-sm font-medium text-[#2563eb]">
              + Adicionar conta
            </Link>
          </div>

          <Separator orientation="vertical" className="hidden md:block" />
          <Separator className="md:hidden" />

          {serieFluxo.length > 0 ? (
            <CashFlowChart serie={serieFluxo} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
              <p className="text-sm font-medium">Sem movimento no extrato ainda.</p>
              <p className="text-muted-foreground text-sm">
                Importe um arquivo OFX para o fluxo de caixa aparecer aqui.
              </p>
              <Link href="/conciliacao" className="text-sm font-medium text-[#2563eb]">
                Ir para conciliação →
              </Link>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:flex-row">
          <PayRecCard
            title="Contas a receber"
            icon={TrendingUp}
            resumo={resumo.aReceber}
            href="/contas-a-receber"
          />
          <PayRecCard
            title="Contas a pagar"
            icon={TrendingDown}
            resumo={resumo.aPagar}
            href="/repasses"
          />
        </div>

        <div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="size-[18px]" viewBox="0 0 18 18" fill="none">
                <path
                  d="M2.5 15V8M9 15V3M15.5 15v-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm font-semibold">Recebimentos por mês</p>
            </div>
            <p className="text-muted-foreground text-[11px]">Últimos 12 meses</p>
          </div>
          <MonthlyBarChart meses={meses} />
        </div>
      </div>
    </>
  );
}
