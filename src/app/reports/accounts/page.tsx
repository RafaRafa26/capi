import { PrintButton } from "@/components/print-button"
import {
  applyAccountsFilters,
  deriveStatus,
  type AccountStatus,
  type SortDirection,
  type SortField,
} from "@/lib/accounts/filter"
import { kindConfig, statusLabel } from "@/lib/accounts/labels"
import { parseChipsFromParams, parsePeriodFromParams } from "@/lib/accounts/params"
import { formatBRL, formatDate } from "@/lib/format"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listPayables, listReceivables } from "@/modules/accounts/service"
import type { LedgerKind } from "@/modules/accounts/types"

function toURLSearchParams(raw: Record<string, string | string[] | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item))
    else params.set(key, value)
  }
  return params
}

export default async function AccountsReportPage(props: PageProps<"/reports/accounts">) {
  const rawSearchParams = await props.searchParams
  const params = toURLSearchParams(rawSearchParams)
  const kind: LedgerKind = rawSearchParams.kind === "pay" ? "pay" : "rec"
  const config = kindConfig[kind]

  const session = await requireSessionOrRedirect()
  const entries = kind === "pay" ? await listPayables(session.organizationId) : await listReceivables(session.organizationId)
  const kindEntries = entries.filter((entry) => entry.kind === kind)

  const today = new Date()
  const period = parsePeriodFromParams(params, today)
  const search = params.get("q") ?? ""
  const chips = parseChipsFromParams(params)
  const status = (params.get("card") as AccountStatus | null) || null
  const sortField = (params.get("sort") as SortField | null) || "dueDate"
  const sortDirection = (params.get("dir") as SortDirection | null) || "asc"

  const { entries: filtered, summary } = applyAccountsFilters(kindEntries, {
    period,
    search,
    chips,
    status,
    sort: { field: sortField, direction: sortDirection },
    today,
  })

  const periodLabel =
    period.from && period.to ? `${formatDate(period.from)} – ${formatDate(period.to)}` : "Todo o período"
  const title = kind === "pay" ? "Contas a pagar" : "Contas a receber"

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-260 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Capi</p>
        <PrintButton label="Exportar PDF" />
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{session.organizationName}</p>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {periodLabel} · {filtered.length} lançamentos · gerado em {formatDate(today)}
        </p>
      </div>

      <div className="rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="h-9 border-b text-xs text-muted-foreground">
              <th className="px-3 text-left font-medium">Vencimento</th>
              <th className="px-3 text-left font-medium">{config.paymentColumnLabel}</th>
              <th className="px-3 text-left font-medium">Descrição</th>
              <th className="px-3 text-left font-medium">Categoria</th>
              <th className="px-3 text-left font-medium">{config.contactLabel}</th>
              <th className="px-3 text-right font-medium">Total</th>
              <th className="px-3 text-right font-medium">{config.amountColumnLabel}</th>
              <th className="px-3 text-left font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lançamento neste filtro.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => {
                const entryStatus = deriveStatus(entry, today)
                const rowTitle = entry.installment ? `${entry.installment} - ${entry.description}` : entry.description
                return (
                  <tr key={entry.id} className="border-b text-[13px] last:border-b-0">
                    <td className="px-3 py-2.5 tabular-nums">{formatDate(entry.dueDate)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                      {entry.paidAt ? formatDate(entry.paidAt) : config.emptyPaymentDate}
                    </td>
                    <td className="px-3 py-2.5">{rowTitle}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{entry.categoryName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{entry.contactName}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{formatBRL(entry.amount)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatBRL(Math.max(0, entry.amount - entry.settledAmount))}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{statusLabel(entryStatus, kind)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-8 rounded-xl bg-muted p-3.5">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold">{formatBRL(summary.total.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{config.summaryPaidLabel}</p>
          <p className="font-semibold">{formatBRL(summary.paid.total)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Em aberto</p>
          <p className="font-semibold">
            {formatBRL(summary.overdue.total + summary.dueToday.total + summary.upcoming.total)}
          </p>
        </div>
      </div>
    </div>
  )
}
