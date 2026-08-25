import { notFound } from "next/navigation";

import { ContatoForm } from "@/components/contatos/contato-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { buscarContato } from "@/modules/contatos/servico";

export default async function EditarContatoPage({
  params,
}: PageProps<"/contatos/[id]/editar">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();
  const contato = await buscarContato(sessao.organizacaoId, id);

  if (!contato) notFound();

  return <ContatoForm contato={contato} />;
}
