import { NewSaleForm } from "@/components/sales/new-sale-form"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"
import { listCategories } from "@/modules/categories/service"
import { listContacts } from "@/modules/contacts/service"

export default async function NewSalePage() {
  const session = await requireSessionOrRedirect()
  const [contacts, categories, bankAccounts] = await Promise.all([
    listContacts(session.organizationId),
    listCategories(session.organizationId),
    listBankAccounts(session.organizationId),
  ])

  const clients = contacts.filter((contact) => contact.contactType === "CLIENT")
  const beneficiaries = contacts.filter((contact) => contact.contactType === "BENEFICIARY")

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <NewSaleForm
        clients={clients}
        beneficiaries={beneficiaries}
        categories={categories}
        bankAccounts={bankAccounts}
      />
    </div>
  )
}
