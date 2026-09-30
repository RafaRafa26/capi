import { PayoutView } from "@/components/payout/payout-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { getPayoutSummary } from "@/modules/payouts/service"

export default async function PayoutPage({ searchParams }: PageProps<"/o/[orgId]/payout">) {
  const session = await requireSessionOrRedirect()
  const [summary, { saldo }] = await Promise.all([getPayoutSummary(session.organizationId), searchParams])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <PayoutView summary={summary} initialFilter={saldo === "com-saldo" || saldo === "sem-saldo" ? saldo : "todos"} />
    </div>
  )
}
