import { notFound } from "next/navigation";

import { ContaBancariaForm } from "@/components/contas-bancarias/conta-bancaria-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { buscarContaBancaria } from "@/modules/contas-bancarias/servico";

export default async function EditarContaBancariaPage({
  params,
}: PageProps<"/contas-bancarias/[id]/editar">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();
  const conta = await buscarContaBancaria(sessao.organizacaoId, id);

  if (!conta) notFound();

  return <ContaBancariaForm conta={conta} />;
}
