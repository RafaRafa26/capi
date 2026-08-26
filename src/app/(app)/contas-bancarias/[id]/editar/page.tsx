import { notFound } from "next/navigation";

import { ContaBancariaForm } from "@/components/contas-bancarias/conta-bancaria-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { buscarContaBancaria } from "@/modules/contas-bancarias/servico";
import { contasBancariasDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function EditarContaBancariaPage({
  params,
}: PageProps<"/contas-bancarias/[id]/editar">) {
  const { id } = await params;
  const sessao = await exigirSessaoOuRedirecionar();
  const conta = await comQuedaParaDemo(
    () => buscarContaBancaria(sessao.organizacaoId, id),
    () => contasBancariasDemo.find((c) => c.id === id) ?? contasBancariasDemo[0],
  );

  if (!conta) notFound();

  return <ContaBancariaForm conta={conta} />;
}
