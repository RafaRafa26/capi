import { PayoutView } from "@/components/payout/payout-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listContacts } from "@/modules/contacts/service"
import { getPayoutSummary } from "@/modules/payouts/service"

export default async function PayoutPage({ searchParams }: PageProps<"/o/[orgId]/payout">) {
  const session = await requireSessionOrRedirect()
  const [summary, contacts, { saldo }] = await Promise.all([
    getPayoutSummary(session.organizationId),
    listContacts(session.organizationId),
    searchParams,
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <PayoutView
        summary={summary}
        contacts={contacts}
        initialFilter={saldo === "com-saldo" || saldo === "sem-saldo" ? saldo : "todos"}
      />
    </div>
  )
}
