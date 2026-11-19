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
  /** After today: a projection from what is still open, not money that moved. */
  projected: boolean
}

/**
 * One end-of-day balance per day of [from, to]:
 * - up to today, what already happened — currentBalance − what was actually
 *   received/paid after that day;
 * - after today, the projection — currentBalance + what is still open and due
 *   from today up to that day (overdue entries stay out: no date to place them).
 */
export function buildBalanceSeries(input: {
  from: Date
  to: Date
  today: Date
  currentBalance: number
  realized: DailyAmount[]
  forecast?: DailyAmount[]
}): BalancePoint[] {
  const todayKey = toDayKey(startOfDay(input.today))
  const forecast = input.forecast ?? []
  const points: BalancePoint[] = []
  const start = startOfDay(input.from)
  const end = startOfDay(input.to)
  for (let d = start; d.getTime() <= end.getTime(); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    const day = toDayKey(d)
    if (day <= todayKey) {
      const after = input.realized.reduce((sum, item) => (item.day > day ? sum + item.amount : sum), 0)
      points.push({ day, date: d, balance: input.currentBalance - after, projected: false })
    } else {
      const due = forecast.reduce(
        (sum, item) => (item.day >= todayKey && item.day <= day ? sum + item.amount : sum),
        0,
      )
      points.push({ day, date: d, balance: input.currentBalance + due, projected: true })
    }
  }
  return points
}

/**
 * Calendar bounds for the chart. "Todo o período" has none of its own, so it
 * runs from the first realized movement to the last open due date (today at
 * least on both ends).
 */
export function flowSeriesBounds(
  range: { from: Date | null; to: Date | null },
  today: Date,
  realized: DailyAmount[],
  forecast: DailyAmount[],
): { from: Date; to: Date } {
  if (range.from && range.to) return { from: startOfDay(range.from), to: startOfDay(range.to) }
  const todayKey = toDayKey(startOfDay(today))
  const fromDay = realized.reduce((min, item) => (item.day < min ? item.day : min), todayKey)
  const toDay = forecast.reduce((max, item) => (item.day > max ? item.day : max), todayKey)
  return { from: fromDayKey(fromDay), to: fromDayKey(toDay) }
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}
