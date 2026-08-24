import { CentrosDeCustoView } from "@/components/centros-de-custo/centros-de-custo-view";
import { centrosDeCusto } from "@/lib/mock-data/centros-de-custo";

export default function CentrosDeCustoPage() {
  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Centros de custo</h1>
      <CentrosDeCustoView centros={centrosDeCusto} />
    </div>
  );
}
