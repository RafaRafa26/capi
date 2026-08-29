import { CategoriasView } from "@/components/categorias/categorias-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategorias } from "@/modules/categorias/servico";
import { categoriasDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function CategoriasPage() {
  const sessao = await exigirSessaoOuRedirecionar();
  const categorias = await comQuedaParaDemo(
    () => listarCategorias(sessao.organizacaoId),
    categoriasDemo,
  );

  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Categorias</h1>
      <CategoriasView categorias={categorias} />
    </div>
  );
}
