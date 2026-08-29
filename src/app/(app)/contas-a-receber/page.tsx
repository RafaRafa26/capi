import { ContasAReceberView } from "@/components/contas-a-receber/contas-a-receber-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarContasBancarias } from "@/modules/contas-bancarias/servico";
import { listarLancamentos } from "@/modules/lancamentos/servico";
import { contasAReceberDemo, contasBancariasDemo } from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function ContasAReceberPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [lancamentos, contas] = await Promise.all([
    comQuedaParaDemo(
      () => listarLancamentos(sessao.organizacaoId, "RECEBIMENTO"),
      contasAReceberDemo,
    ),
    comQuedaParaDemo(() => listarContasBancarias(sessao.organizacaoId), contasBancariasDemo),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 md:p-10">
      <ContasAReceberView
        lancamentos={lancamentos}
        contasDeTerceiro={contas
          .filter((c) => c.natureza === "TERCEIRO" && c.ativa)
          .map((c) => ({ id: c.id, nome: c.nome }))}
      />
    </div>
  );
}
