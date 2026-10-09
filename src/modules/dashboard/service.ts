import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { getBankAccountsOverview } from "@/modules/bank-accounts/service"
import { getPayoutSummary } from "@/modules/payouts/service"
import { bucketEntries, type BucketableEntry, type DailyAmount, type ResumoLancamentos } from "./domain"

async function summarize(tx: Tx, type: "RECEIVABLE" | "PAYABLE"): Promise<ResumoLancamentos> {
  const entries = await tx.entry.findMany({
    where: { type, status: { in: ["FORECAST", "PARTIAL"] } },
    include: { contact: true },
    orderBy: { dueDate: "asc" },
  })

  const bucketable: BucketableEntry[] = entries.map((entry) => ({
    contactName: entry.contact?.name ?? "",
    description: entry.description,
    dueDate: fromDbDate(entry.dueDate),
    amount: entry.amount,
    settledAmount: entry.settledAmount,
    status: entry.status,
  }))

  return bucketEntries(bucketable, new Date())
}

/** "Contas a receber" card — open RECEIVABLE entries (from Sale, avulsas). */
export async function getReceivablesSummary(organizationId: string): Promise<ResumoLancamentos> {
  return withOrganization(organizationId, (tx) => summarize(tx, "RECEIVABLE"))
}

/** "Contas a pagar" card — open PAYABLE entries (despesas, avulsas). */
export async function getPayablesSummary(organizationId: string): Promise<ResumoLancamentos> {
  return withOrganization(organizationId, (tx) => summarize(tx, "PAYABLE"))
}

/** `@db.Date` columns come back as UTC midnight — read the calendar day in UTC. */
function dbDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface OverviewData {
  accounts: { id: string; name: string; balance: number }[]
  receivables: ResumoLancamentos
  payables: ResumoLancamentos
  pendingReconciliationCount: number
  beneficiariesWithBalanceCount: number
  /** Reconciled bank movements per day (active accounts), from Jan 1st of last year on. */
  realizedByDay: DailyAmount[]
}

/** Everything the "Visão geral" screen needs, in one round of parallel queries. */
export async function getOverview(organizationId: string): Promise<OverviewData> {
  const now = new Date()
  const realizedSince = new Date(Date.UTC(now.getFullYear() - 1, 0, 1))

  const [accounts, receivables, payables, payoutSummary, flows] = await Promise.all([
    getBankAccountsOverview(organizationId),
    getReceivablesSummary(organizationId),
    getPayablesSummary(organizationId),
    getPayoutSummary(organizationId),
    withOrganization(organizationId, async (tx) => {
      const realized = await tx.bankTransaction.groupBy({
        by: ["date"],
        where: { status: "RECONCILED", date: { gte: realizedSince }, bankAccount: { active: true } },
        _sum: { amount: true },
      })
      return { realized }
    }),
  ])

  return {
    accounts: accounts.map((account) => ({ id: account.id, name: account.name, balance: account.currentBalance })),
    receivables,
    payables,
    pendingReconciliationCount: accounts.reduce((sum, account) => sum + account.pendingCount, 0),
    beneficiariesWithBalanceCount: payoutSummary.beneficiaries.filter((b) => b.available > 0).length,
    realizedByDay: flows.realized.map((row) => ({ day: dbDayKey(row.date), amount: row._sum.amount ?? 0 })),
  }
}
