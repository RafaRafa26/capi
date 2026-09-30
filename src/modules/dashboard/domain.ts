// Pure bucketing for the dashboard's "Contas a receber"/"Contas a pagar"
// cards — no I/O, see AGENTS.md/ARQUITETURA.md §8.2.

export type LancamentoBucketKey = "vencido" | "venceHoje" | "aVencer"

export interface Lancamento {
  contato: string
  descricao: string
  vencimento: Date
  valor: number
}

export interface ResumoLancamentos {
  total: number
  buckets: Record<LancamentoBucketKey, { count: number; total: number; itens: Lancamento[] }>
}

export interface BucketableEntry {
  contactName: string
  description: string
  dueDate: Date
  /** Valor previsto da parcela. */
  amount: number
  /** Já liquidado até agora — null/0 enquanto não há baixa nem conciliação. */
  settledAmount: number | null
  status: "FORECAST" | "PARTIAL" | "SETTLED" | "CANCELED"
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Groups open entries (FORECAST/PARTIAL — SETTLED and CANCELED don't belong
 * in a "still owed" card) into vencido/vence hoje/a vencer, comparing due
 * dates to `today` with time stripped off. `valor` per item is what's still
 * open (`amount - settledAmount`), so a future partial settlement/baixa
 * already shows the right remainder here without any extra wiring.
 */
export function bucketEntries(entries: BucketableEntry[], today: Date): ResumoLancamentos {
  const todayStart = startOfDay(today)
  const open = entries.filter((entry) => entry.status === "FORECAST" || entry.status === "PARTIAL")

  const itemsByBucket: Record<LancamentoBucketKey, Lancamento[]> = {
    vencido: [],
    venceHoje: [],
    aVencer: [],
  }

  for (const entry of open) {
    const due = startOfDay(entry.dueDate)
    const key: LancamentoBucketKey =
      due.getTime() < todayStart.getTime() ? "vencido" : due.getTime() === todayStart.getTime() ? "venceHoje" : "aVencer"

    itemsByBucket[key].push({
      contato: entry.contactName,
      descricao: entry.description,
      vencimento: entry.dueDate,
      valor: entry.amount - (entry.settledAmount ?? 0),
    })
  }

  const keys: LancamentoBucketKey[] = ["vencido", "venceHoje", "aVencer"]
  for (const key of keys) {
    itemsByBucket[key].sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime())
  }

  const buckets = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        count: itemsByBucket[key].length,
        total: itemsByBucket[key].reduce((sum, item) => sum + item.valor, 0),
        itens: itemsByBucket[key],
      },
    ]),
  ) as ResumoLancamentos["buckets"]

  return {
    total: keys.reduce((sum, key) => sum + buckets[key].total, 0),
    buckets,
  }
}

// ---------------------------------------------------------------------------
// "Fluxo de caixa" — pure balance series for the overview chart. Days travel as
// "yyyy-MM-dd" keys (calendar days, no timezone), so the server can hand them
// to the client and the client can pick any period without another request.

export type FlowPeriodPreset = "last7" | "last30" | "last90" | "month" | "quarter" | "year"

export const flowPeriodLabel: Record<FlowPeriodPreset, string> = {
  last7: "Últimos 7 dias",
  last30: "Últimos 30 dias",
  last90: "Últimos 90 dias",
  month: "Mês atual",
  quarter: "Trimestre atual",
  year: "Ano atual",
}

export const flowPeriodOrder: FlowPeriodPreset[] = ["last7", "last30", "last90", "month", "quarter", "year"]

/** First and last calendar day of the period (both inclusive, time at 00:00). */
export function getFlowPeriod(preset: FlowPeriodPreset, today: Date): { from: Date; to: Date } {
  const t = startOfDay(today)
  const y = t.getFullYear()
  const m = t.getMonth()
  switch (preset) {
    case "last7":
      return { from: new Date(y, m, t.getDate() - 6), to: t }
    case "last30":
      return { from: new Date(y, m, t.getDate() - 29), to: t }
    case "last90":
      return { from: new Date(y, m, t.getDate() - 89), to: t }
    case "month":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) }
    case "quarter": {
      const first = m - (m % 3)
      return { from: new Date(y, first, 1), to: new Date(y, first + 3, 0) }
    }
    case "year":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) }
  }
}

export function toDayKey(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${mm}-${dd}`
}

/** Net amount (signed cents) that landed on — or is due on — one calendar day. */
export interface DailyAmount {
  day: string
  amount: number
}

export interface BalancePoint {
  day: string
  date: Date
  balance: number
}

/**
 * One end-of-day balance per day of [from, to], stopping at today — only
 * what already happened: currentBalance − what was actually received/paid
 * after that day.
 */
export function buildBalanceSeries(input: {
  from: Date
  to: Date
  today: Date
  currentBalance: number
  realized: DailyAmount[]
}): BalancePoint[] {
  const todayStart = startOfDay(input.today)
  const points: BalancePoint[] = []
  const start = startOfDay(input.from)
  const end = new Date(Math.min(startOfDay(input.to).getTime(), todayStart.getTime()))
  for (let d = start; d.getTime() <= end.getTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const day = toDayKey(d)
    const after = input.realized.reduce((sum, item) => (item.day > day ? sum + item.amount : sum), 0)
    points.push({ day, date: d, balance: input.currentBalance - after })
  }
  return points
}
