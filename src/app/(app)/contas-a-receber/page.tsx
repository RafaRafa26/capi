import { ContasAReceberView } from "@/components/contas-a-receber/contas-a-receber-view";
import { contasAReceber } from "@/lib/mock-data/lancamentos";

export default function ContasAReceberPage() {
  return (
    <div className="flex flex-1 flex-col gap-2 p-6 md:p-10">
      <ContasAReceberView lancamentos={contasAReceber} />
    </div>
  );
}
