import { RepassesView } from "@/components/repasses/repasses-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategoriasPlanas } from "@/modules/categorias/servico";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { posicaoDosFavorecidos } from "@/modules/custodia/servico";

export default async function RepassesPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [favorecidos, contas, categorias] = await Promise.all([
    posicaoDosFavorecidos(sessao.organizacaoId),
    listarContasProprias(sessao.organizacaoId),
    listarCategoriasPlanas(sessao.organizacaoId, "DESPESA"),
  ]);

  // O repasse precisa de uma categoria de despesa. Preferimos a que menciona
  // repasse; sem ela, a primeira de despesa serve.
  const categoriaRepasse =
    categorias.find((c) => /repasse/i.test(c.nome)) ?? categorias[0];

  return (
    <RepassesView
      favorecidos={favorecidos}
      contasProprias={contas}
      categoriaRepasseId={categoriaRepasse?.id ?? null}
    />
  );
}
