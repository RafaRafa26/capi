import { NewExpenseForm } from "@/components/expenses/new-expense-form"
import { requireSessionOrRedirect } from "@/modules/auth/session"
import { listBankAccounts } from "@/modules/bank-accounts/service"
import { listCategories } from "@/modules/categories/service"
import { listContacts } from "@/modules/contacts/service"

export default async function NewExpensePage() {
  const session = await requireSessionOrRedirect()
  const [contacts, categories, bankAccounts] = await Promise.all([
    listContacts(session.organizationId),
    listCategories(session.organizationId),
    listBankAccounts(session.organizationId),
  ])

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <NewExpenseForm contacts={contacts} categories={categories} bankAccounts={bankAccounts} />
    </div>
  )
}
