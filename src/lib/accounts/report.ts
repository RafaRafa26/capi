// O relatório de contas (RN-36) montado uma vez e desenhado duas — no PDF
// (components/accounts/accounts-report-pdf.tsx) e no XLSX (report-xlsx.ts).
// Lê os mesmos query params da tela (params.ts), então o arquivo exportado
// bate com o que estava filtrado na hora do clique.
import {
  applyAccountsFilters,
  deriveStatus,
  type AccountStatus,
  type SortDirection,
  type SortField,
} from "@/lib/accounts/filter"
import { chipLabel, kindConfig, statusLabel } from "@/lib/accounts/labels"
import { chipOrder, parseChipsFromParams, parsePeriodFromParams } from "@/lib/accounts/params"
import { formatDate } from "@/lib/format"
import type { AccountEntry, LedgerKind } from "@/modules/accounts/types"

export const NO_BENEFICIARY_LABEL = "Sem favorecido"

export interface ReportEntry {
  entry: AccountEntry
  status: AccountStatus
  statusLabel: string
  // amount − settledAmount, nunca negativo — o "A receber"/"A pagar".
  openAmount: number
  // Os outros favorecidos de um lançamento que aparece em mais de uma seção.
  sharedWith: string[]
}

export interface ReportGroup {
  name: string
  entries: ReportEntry[]
  openTotal: number
}

export interface AccountsReport {
  kind: LedgerKind
  organizationName: string
  title: string
  periodLabel: string
  // "Marcador: Combinou Pagamento · Busca: "lucia"" — vazio sem filtro.
  filtersLabel: string
  groupLabel: string
  generatedAt: Date
  groups: ReportGroup[]
  // Cada lançamento conta uma vez, mesmo aparecendo em várias seções.
  totals: { count: number; amount: number; settled: number; open: number }
}

export function openAmount(entry: Pick<AccountEntry, "amount" | "settledAmount">): number {
  return Math.max(0, entry.amount - entry.settledAmount)
}

// No receber, o favorecido é quem recebe o repasse da venda; no pagar, quem
// recebe o pagamento já é o próprio contato do lançamento.
function groupNames(entry: AccountEntry, kind: LedgerKind): string[] {
  if (kind === "pay") return [entry.contactName]
  return entry.beneficiaryNames.length > 0 ? entry.beneficiaryNames : [NO_BENEFICIARY_LABEL]
}

export function buildAccountsReport({
  entries,
  kind,
  params,
  organizationName,
  today,
}: {
  entries: AccountEntry[]
  kind: LedgerKind
  params: URLSearchParams
  organizationName: string
  today: Date
}): AccountsReport {
  const period = parsePeriodFromParams(params, today)
  const search = params.get("q") ?? ""
  const chips = parseChipsFromParams(params)
  const status = (params.get("card") as AccountStatus | null) || null

  const { entries: filtered } = applyAccountsFilters(
    entries.filter((entry) => entry.kind === kind),
    {
      period,
      search,
      chips,
      status,
      sort: {
        field: (params.get("sort") as SortField | null) || "dueDate",
        direction: (params.get("dir") as SortDirection | null) || "asc",
      },
      today,
    },
  )

  // Com o chip Favorecido ativo, um lançamento dividido não deve abrir seção
  // para o favorecido que ficou de fora do filtro.
  const beneficiaryFilter = kind === "rec" && chips.contact?.length ? new Set(chips.contact) : null

  const byName = new Map<string, ReportEntry[]>()
  for (const entry of filtered) {
    const names = groupNames(entry, kind)
    const entryStatus = deriveStatus(entry, today)
    for (const name of names) {
      if (beneficiaryFilter && !beneficiaryFilter.has(name)) continue
      const list = byName.get(name) ?? []
      list.push({
        entry,
        status: entryStatus,
        statusLabel: statusLabel(entryStatus, kind),
        openAmount: openAmount(entry),
        sharedWith: names.filter((other) => other !== name),
      })
      byName.set(name, list)
    }
  }

  const groups = Array.from(byName, ([name, groupEntries]) => ({
    name,
    entries: groupEntries,
    openTotal: groupEntries.reduce((sum, item) => sum + item.openAmount, 0),
  })).sort((a, b) => {
    if (a.name === NO_BENEFICIARY_LABEL) return 1
    if (b.name === NO_BENEFICIARY_LABEL) return -1
    return a.name.localeCompare(b.name, "pt-BR")
  })

  const filters: string[] = []
  if (status) filters.push(`Situação: ${statusLabel(status, kind)}`)
  for (const key of chipOrder) {
    const values = chips[key]
    if (values?.length) filters.push(`${chipLabel[key]}: ${values.join(", ")}`)
  }
  if (search) filters.push(`Busca: "${search}"`)

  return {
    kind,
    organizationName,
    title: kind === "pay" ? "Contas a pagar" : "Contas a receber",
    // Datas explícitas, não "Este mês": o arquivo é lido dias depois.
    periodLabel:
      period.from && period.to ? `${formatDate(period.from)} – ${formatDate(period.to)}` : "Todo o período",
    filtersLabel: filters.join(" · "),
    groupLabel: kind === "pay" ? kindConfig.pay.contactLabel : "Favorecido",
    generatedAt: today,
    groups,
    totals: {
      count: filtered.length,
      amount: filtered.reduce((sum, entry) => sum + entry.amount, 0),
      settled: filtered.reduce((sum, entry) => sum + Math.min(entry.settledAmount, entry.amount), 0),
      open: filtered.reduce((sum, entry) => sum + openAmount(entry), 0),
    },
  }
}

export function reportFileName(report: AccountsReport, extension: "pdf" | "xlsx"): string {
  const slug = report.kind === "pay" ? "contas-a-pagar" : "contas-a-receber"
  const date = report.generatedAt.toLocaleDateString("sv-SE") // AAAA-MM-DD
  return `${slug}-${date}.${extension}`
}
