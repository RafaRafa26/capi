import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { bucketEntries, type BucketableEntry, type ResumoLancamentos } from "./domain"

async function summarize(tx: Tx, type: "RECEIVABLE" | "PAYABLE"): Promise<ResumoLancamentos> {
  const entries = await tx.entry.findMany({
    where: { type, status: { in: ["FORECAST", "PARTIAL"] } },
    include: { contact: true },
    orderBy: { dueDate: "asc" },
  })

  const bucketable: BucketableEntry[] = entries.map((entry) => ({
    contactName: entry.contact.name,
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
