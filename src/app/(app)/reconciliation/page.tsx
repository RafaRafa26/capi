import { redirect } from "next/navigation";

// A conciliação acontece por conta (/reconciliation/[bankAccountId]); sem
// conta escolhida, quem cai aqui vai para a lista de contas.
export default function ReconciliationIndexPage() {
  redirect("/accounts");
}
