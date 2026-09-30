import { notFound } from "next/navigation";

import { ReconciliationView } from "@/components/reconciliation/reconciliation-view";
import { requireSessionOrRedirect } from "@/modules/auth/session";
import { getBankAccount, listBankAccounts } from "@/modules/bank-accounts/service";
import { listCategories } from "@/modules/categories/service";
import { listContacts } from "@/modules/contacts/service";
import { NotFound } from "@/shared/errors";

export default async function ReconciliationAccountPage(props: PageProps<"/o/[orgId]/reconciliation/[bankAccountId]">) {
  const { bankAccountId } = await props.params;
  const session = await requireSessionOrRedirect();

  let bankAccount;
  try {
    bankAccount = await getBankAccount(session.organizationId, bankAccountId);
  } catch (error) {
    if (error instanceof NotFound) notFound();
    throw error;
  }

  const [bankAccounts, contacts, categories] = await Promise.all([
    listBankAccounts(session.organizationId),
    listContacts(session.organizationId),
    listCategories(session.organizationId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-6">
      <ReconciliationView bankAccount={bankAccount} bankAccounts={bankAccounts} contacts={contacts} categories={categories} />
    </div>
  );
}
