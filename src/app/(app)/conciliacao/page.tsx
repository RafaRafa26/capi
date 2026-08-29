import { ConciliacaoView } from "@/components/conciliacao/conciliacao-view";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { paresParaConciliar } from "@/modules/conciliacao/servico";
import { listarCategoriasPlanas } from "@/modules/categorias/servico";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { listarContatos } from "@/modules/contatos/servico";
import {
  candidatosDemo,
  categoriasPlanasDemo,
  contasPropriasDemo,
  contatosSelecaoDemo,
  paresConciliacaoDemo,
} from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function ConciliacaoPage({
  searchParams,
}: PageProps<"/conciliacao">) {
  const sessao = await exigirSessaoOuRedirecionar();
  const params = await searchParams;
  const contaFiltro = typeof params?.conta === "string" ? params.conta : undefined;

  const [{ pares, candidatos }, contas, contatos, categorias] = await Promise.all([
    comQuedaParaDemo(
      () => paresParaConciliar(sessao.organizacaoId, contaFiltro),
      () => ({ pares: paresConciliacaoDemo, candidatos: candidatosDemo }),
    ),
    comQuedaParaDemo(
      () => listarContasProprias(sessao.organizacaoId),
      contasPropriasDemo,
    ),
    comQuedaParaDemo(
      () => listarContatos(sessao.organizacaoId),
      () => contatosSelecaoDemo,
    ),
    comQuedaParaDemo(
      () => listarCategoriasPlanas(sessao.organizacaoId),
      categoriasPlanasDemo,
    ),
  ]);

  return (
    <ConciliacaoView
      pares={pares}
      candidatos={candidatos}
      contas={contas}
      contatos={contatos.map((c) => ({ id: c.id, nome: c.nome }))}
      categorias={categorias}
      contaSelecionada={contaFiltro ?? null}
    />
  );
}
