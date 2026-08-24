import { ConciliacaoView } from "@/components/conciliacao/conciliacao-view";
import { itensConciliacao } from "@/lib/mock-data/conciliacao";

export default function ConciliacaoPage() {
  return <ConciliacaoView itens={itensConciliacao} />;
}
