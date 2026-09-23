import { ReconciliationView } from "@/components/reconciliation/reconciliation-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"
import { listCategories } from "@/modules/categories/service"
import { listContacts } from "@/modules/contacts/service"

export default async function ReconciliationPage() {
  const session = await requireSessionOrRedirect()
  const [bankAccounts, contacts, categories] = await Promise.all([
    listBankAccounts(session.organizationId),
    listContacts(session.organizationId),
    listCategories(session.organizationId),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-6">
      <ReconciliationView bankAccounts={bankAccounts} contacts={contacts} categories={categories} />
    </div>
  )
}
