import { Suspense } from "react";

import { ContatosTable } from "@/components/contatos/contatos-table";
import { contatos } from "@/lib/mock-data/contatos";

export default function ContatosPage() {
  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Contatos</h1>
      <Suspense>
        <ContatosTable contatos={contatos} />
      </Suspense>
    </div>
  );
}
