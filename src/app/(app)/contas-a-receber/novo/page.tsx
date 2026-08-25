import { NovoRecebimentoForm } from "@/components/contas-a-receber/novo-recebimento-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategoriasPlanas } from "@/modules/categorias/servico";
import { listarCentrosDeCusto } from "@/modules/centros-de-custo/servico";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { listarContatos, listarFavorecidos } from "@/modules/contatos/servico";

export default async function NovoRecebimentoPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [contatos, favorecidos, categorias, centros, contas] = await Promise.all([
    listarContatos(sessao.organizacaoId),
    listarFavorecidos(sessao.organizacaoId),
    listarCategoriasPlanas(sessao.organizacaoId, "RECEITA"),
    listarCentrosDeCusto(sessao.organizacaoId),
    listarContasProprias(sessao.organizacaoId),
  ]);

  return (
    <NovoRecebimentoForm
      clientes={contatos
        .filter((c) => c.ativo && c.papeis.includes("PAGADOR"))
        .map((c) => ({ id: c.id, nome: c.nome }))}
      favorecidos={favorecidos.map((f) => ({ id: f.id, nome: f.nome }))}
      categoriasReceita={categorias.map((c) => ({ value: c.id, label: c.nome }))}
      centrosDeCusto={centros.filter((c) => c.ativo)}
      contasRecebimento={contas}
    />
  );
}
