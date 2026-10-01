import { redirect } from "next/navigation";

import { orgPath } from "@/lib/org-path";

// A conciliação acontece por conta (/reconciliation/[bankAccountId]); sem
// conta escolhida, quem cai aqui vai para a lista de contas.
export default async function ReconciliationIndexPage({ params }: PageProps<"/o/[orgId]/reconciliation">) {
  const { orgId } = await params;
  redirect(orgPath(orgId, "/accounts"));
}
