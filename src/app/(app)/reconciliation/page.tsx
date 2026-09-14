import { ReconciliationView } from "@/components/reconciliation/reconciliation-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"

export default async function ReconciliationPage() {
  const session = await requireSessionOrRedirect()
  const bankAccounts = await listBankAccounts(session.organizationId)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ReconciliationView bankAccounts={bankAccounts} />
    </div>
  )
}
