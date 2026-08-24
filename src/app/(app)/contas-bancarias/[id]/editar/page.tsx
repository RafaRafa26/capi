import { notFound } from "next/navigation";

import { ContaBancariaForm } from "@/components/contas-bancarias/conta-bancaria-form";
import { getContaBancariaById } from "@/lib/mock-data/contas-bancarias";

export default async function EditarContaBancariaPage({
  params,
}: PageProps<"/contas-bancarias/[id]/editar">) {
  const { id } = await params;
  const conta = getContaBancariaById(id);

  if (!conta) {
    notFound();
  }

  return <ContaBancariaForm conta={conta} />;
}
