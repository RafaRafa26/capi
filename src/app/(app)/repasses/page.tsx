import { RepassesView } from "@/components/repasses/repasses-view";
import { favorecidosRepasse } from "@/lib/mock-data/repasses";

export default function RepassesPage() {
  return <RepassesView favorecidos={favorecidosRepasse} />;
}
