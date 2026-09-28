import { BankAccountsWorkspace } from "@/components/reconciliation/bank-accounts-workspace";
import { requireSessionOrRedirect } from "@/modules/auth/session";
import { getBankAccountStatement, getBankAccountsOverview } from "@/modules/bank-accounts/service";
import type { BankAccountStatement } from "@/modules/bank-accounts/types";

export default async function ReconciliationOverviewPage() {
  const session = await requireSessionOrRedirect();
  const accounts = await getBankAccountsOverview(session.organizationId);

  let initialStatement: BankAccountStatement | null = null;
  if (accounts[0]) {
    initialStatement = await getBankAccountStatement(session.organizationId, accounts[0].id);
  }

  return (
    <div className="flex w-full flex-1">
      <BankAccountsWorkspace accounts={accounts} initialStatement={initialStatement} />
    </div>
  );
}
