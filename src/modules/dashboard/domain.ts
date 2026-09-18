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
