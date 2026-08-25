import { CentrosDeCustoView } from "@/components/centros-de-custo/centros-de-custo-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCentrosDeCusto } from "@/modules/centros-de-custo/servico";

export default async function CentrosDeCustoPage() {
  const sessao = await exigirSessaoOuRedirecionar();
  const centros = await listarCentrosDeCusto(sessao.organizacaoId);

  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Centros de custo</h1>
      <CentrosDeCustoView centros={centros} />
    </div>
  );
}
