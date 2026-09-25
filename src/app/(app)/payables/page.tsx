import { Suspense } from "react"

import { AccountsView } from "@/components/accounts/accounts-view"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"
import { listBeneficiaries, listPayables } from "@/modules/accounts/service"
import { listCategories } from "@/modules/categories/service"
import { listContacts } from "@/modules/contacts/service"

export default async function PayablesPage() {
  const session = await requireSessionOrRedirect()
  const [entries, beneficiaries, contacts, categories, bankAccounts] = await Promise.all([
    listPayables(session.organizationId),
    listBeneficiaries(session.organizationId),
    listContacts(session.organizationId),
    listCategories(session.organizationId),
    listBankAccounts(session.organizationId),
  ])

  return (
    <Suspense>
      <AccountsView
        kind="pay"
        entries={entries}
        beneficiaries={beneficiaries}
        contacts={contacts}
        categories={categories}
        bankAccounts={bankAccounts}
      />
    </Suspense>
  )
}
