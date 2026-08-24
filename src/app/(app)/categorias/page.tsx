import { CategoriasView } from "@/components/categorias/categorias-view";
import { categorias } from "@/lib/mock-data/categorias";

export default function CategoriasPage() {
  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">Configurações {'>'} Categorias</p>
        <h1 className="text-2xl font-bold">Categorias</h1>
      </div>
      <CategoriasView categorias={categorias} />
    </div>
  );
}
