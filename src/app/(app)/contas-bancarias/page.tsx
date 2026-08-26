import { ContasBancariasTable } from "@/components/contas-bancarias/contas-bancarias-table";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarContasBancarias } from "@/modules/contas-bancarias/servico";
import { contasBancariasDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function ContasBancariasPage() {
  const sessao = await exigirSessaoOuRedirecionar();
  const contas = await comQuedaParaDemo(
    () => listarContasBancarias(sessao.organizacaoId),
    contasBancariasDemo,
  );

  return (
    <div className="flex flex-1 flex-col gap-7 p-6 md:p-10">
      <h1 className="text-2xl font-bold">Contas bancárias</h1>
      <ContasBancariasTable contas={contas} />
    </div>
  );
}
