import { notFound } from "next/navigation";

import { ContatoForm } from "@/components/contatos/contato-form";
import { getContatoById } from "@/lib/mock-data/contatos";

export default async function EditarContatoPage({
  params,
}: PageProps<"/contatos/[id]/editar">) {
  const { id } = await params;
  const contato = getContatoById(id);

  if (!contato) {
    notFound();
  }

  return <ContatoForm contato={contato} />;
}
