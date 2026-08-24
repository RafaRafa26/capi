import { Calendar, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { MonthlyBarChart } from "@/components/dashboard/monthly-bar-chart";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const bankAccounts = [
  { name: "ASAAS", detail: "Ag 1234 / CC 56789", balance: "R$ 85.420,30" },
];

const receivables = [
  { label: "Vencido", count: 3, value: "R$ 24.500,00", tone: "destructive" },
  { label: "Vence hoje", count: 1, value: "R$ 8.200,00", tone: "warning" },
  { label: "A vencer", count: 12, value: "R$ 156.320,00", tone: "muted" },
] as const;

const payables = [
  { label: "Vencido", count: 2, value: "R$ 12.870,00", tone: "destructive" },
  { label: "Vence hoje", count: 0, value: "R$ 0,00", tone: "warning" },
  { label: "A vencer", count: 8, value: "R$ 89.450,00", tone: "muted" },
] as const;

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

function PayRecCard({
  title,
  icon: Icon,
  total,
  rows,
}: {
  title: string;
  icon: typeof TrendingUp;
  total: string;
  rows: readonly { label: string; count: number; value: string; tone: string }[];
}) {
  return (
    <div className="bg-card border-border flex flex-1 flex-col gap-4 rounded-xl border p-6 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-[18px]" />
          <p className="text-sm font-semibold">{title}</p>
        </div>
        <p className="text-muted-foreground text-[11px]">Total: {total}</p>
      </div>
      <div className="flex w-full flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="border-border flex w-full items-center justify-between border-b py-3 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className={cn("size-2 rounded-sm", toneDot[row.tone])} />
              <p className="text-sm font-medium">{row.label}</p>
              <Badge
                variant="secondary"
                className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", toneBadge[row.tone])}
              >
                {row.count} lançamento{row.count === 1 ? "" : "s"}
              </Badge>
            </div>
            <p className="text-sm font-semibold">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
          <h1 className="text-2xl font-bold">Visão geral</h1>
        </div>
      </div>

      <div className="bg-card border-border flex flex-col rounded-xl border shadow-sm md:flex-row">
        <div className="flex w-full flex-col gap-4 p-6 md:w-[360px]">
          <div className="flex items-center gap-2">
            <Landmark className="size-5" />
            <p className="text-sm font-semibold">Contas bancárias</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Saldo total</p>
            <p className="text-3xl font-bold">R$ 42.830,67</p>
          </div>
          <Link href="/contas-bancarias" className="text-sm font-medium text-[#2563eb]">
            Ver todas →
          </Link>
          <Separator />
          <div className="flex flex-col">
            {bankAccounts.map((account) => (
              <div
                key={account.name}
                className="border-border flex items-center justify-between border-b py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-semibold">{account.name}</p>
                  <p className="text-muted-foreground text-xs">{account.detail}</p>
                </div>
                <p className="text-sm font-semibold">{account.balance}</p>
              </div>
            ))}
          </div>
          <Link href="/contas-bancarias" className="text-sm font-medium text-[#2563eb]">
            + Adicionar conta
          </Link>
        </div>

        <Separator orientation="vertical" className="hidden md:block" />
        <Separator className="md:hidden" />

        <div className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="size-5" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 17V9M9 17V5M15 17v-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              <p className="text-sm font-semibold">Fluxo de caixa</p>
            </div>
            <div className="bg-card border-border flex items-center gap-2 rounded-md border px-3 py-2">
              <Calendar className="size-4" />
              <span className="text-sm font-medium">Agosto de 2026</span>
            </div>
          </div>
          <div className="border-border flex w-full gap-4 border-t border-b py-2.5">
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Saldo inicial</p>
              <p className="text-sm font-medium">R$ 98.540,00</p>
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Entradas previstas</p>
              <p className="text-sm font-medium text-[#0d9488]">R$ 187.320,00</p>
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Saídas previstas</p>
              <p className="text-sm font-medium text-[#e5484d]">R$ 143.030,00</p>
            </div>
            <div className="flex-1">
              <p className="text-muted-foreground text-xs">Resultado projetado</p>
              <p className="text-sm font-medium text-[#f76b15]">R$ 142.830,00</p>
            </div>
          </div>
          <CashFlowChart />
          <Link href="/conciliacao" className="text-sm font-medium text-[#2563eb]">
            Gerenciar fluxo de caixa →
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <PayRecCard title="Contas a receber" icon={TrendingUp} total="R$ 189.020,00" rows={receivables} />
        <PayRecCard title="Contas a pagar" icon={TrendingDown} total="R$ 102.320,00" rows={payables} />
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
        <MonthlyBarChart />
      </div>
    </div>
  );
}
