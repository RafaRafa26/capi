import { PayoutView } from "@/components/payout/payout-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { getPayoutSummary } from "@/modules/payouts/service"

export default async function PayoutPage() {
  const session = await requireSessionOrRedirect()
  const summary = await getPayoutSummary(session.organizationId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <PayoutView summary={summary} />
    </div>
  )
}
