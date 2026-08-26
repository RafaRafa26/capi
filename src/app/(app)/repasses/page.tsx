import { RepassesView } from "@/components/repasses/repasses-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategoriasPlanas } from "@/modules/categorias/servico";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { posicaoDosFavorecidos } from "@/modules/custodia/servico";
import {
  categoriasDemo,
  contasBancariasDemo,
  posicaoFavorecidosDemo,
} from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function RepassesPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [favorecidos, contas, categorias] = await Promise.all([
    comQuedaParaDemo(
      () => posicaoDosFavorecidos(sessao.organizacaoId),
      posicaoFavorecidosDemo,
    ),
    comQuedaParaDemo(
      () => listarContasProprias(sessao.organizacaoId),
      () => contasBancariasDemo.filter((c) => c.natureza === "PROPRIA"),
    ),
    comQuedaParaDemo(
      () => listarCategoriasPlanas(sessao.organizacaoId, "DESPESA"),
      () =>
        categoriasDemo
          .filter((c) => c.tipo === "DESPESA")
          .map((c) => ({ id: c.id, tipo: c.tipo, nome: c.nome })),
    ),
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
