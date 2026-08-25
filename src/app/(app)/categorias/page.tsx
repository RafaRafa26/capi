import { CategoriasView } from "@/components/categorias/categorias-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategorias } from "@/modules/categorias/servico";

export default async function CategoriasPage() {
  const sessao = await exigirSessaoOuRedirecionar();
  const categorias = await listarCategorias(sessao.organizacaoId);

  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Categorias</h1>
      <CategoriasView categorias={categorias} />
    </div>
  );
}
