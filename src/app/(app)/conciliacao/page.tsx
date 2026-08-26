import { ConciliacaoView } from "@/components/conciliacao/conciliacao-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { transacoesPendentes } from "@/modules/extrato/servico";
import { lancamentosEmAberto } from "@/modules/lancamentos/servico";
import {
  contasBancariasDemo,
  lancamentosEmAbertoDemo,
  transacoesPendentesDemo,
} from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function ConciliacaoPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [transacoes, candidatos, contas] = await Promise.all([
    comQuedaParaDemo(() => transacoesPendentes(sessao.organizacaoId), transacoesPendentesDemo),
    comQuedaParaDemo(() => lancamentosEmAberto(sessao.organizacaoId), lancamentosEmAbertoDemo),
    comQuedaParaDemo(
      () => listarContasProprias(sessao.organizacaoId),
      () => contasBancariasDemo.filter((c) => c.natureza === "PROPRIA"),
    ),
  ]);

  return (
    <ConciliacaoView transacoes={transacoes} candidatos={candidatos} contas={contas} />
  );
}
