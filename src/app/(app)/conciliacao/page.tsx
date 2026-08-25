import { ConciliacaoView } from "@/components/conciliacao/conciliacao-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { transacoesPendentes } from "@/modules/extrato/servico";
import { lancamentosEmAberto } from "@/modules/lancamentos/servico";

export default async function ConciliacaoPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [transacoes, candidatos, contas] = await Promise.all([
    transacoesPendentes(sessao.organizacaoId),
    lancamentosEmAberto(sessao.organizacaoId),
    listarContasProprias(sessao.organizacaoId),
  ]);

  return (
    <ConciliacaoView transacoes={transacoes} candidatos={candidatos} contas={contas} />
  );
}
