import { notFound } from "next/navigation";

import { ContatoForm } from "@/components/contatos/contato-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { buscarContato } from "@/modules/contatos/servico";
import { contatosDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function EditarContatoPage({
  params,
}: PageProps<"/contatos/[id]/editar">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();
  const contato = await comQuedaParaDemo(
    () => buscarContato(sessao.organizacaoId, id),
    () => contatosDemo.find((c) => c.id === id) ?? contatosDemo[0],
  );

  if (!contato) notFound();

  return <ContatoForm contato={contato} />;
}
