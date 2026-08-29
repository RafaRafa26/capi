import { NovoRecebimentoForm } from "@/components/contas-a-receber/novo-recebimento-form";
import { exigirSessaoOuRedirecionar } from "@/modules/auth/sessao";
import { listarCategoriasPlanas } from "@/modules/categorias/servico";
import { listarCentrosDeCusto } from "@/modules/centros-de-custo/servico";
import { listarContasProprias } from "@/modules/contas-bancarias/servico";
import { listarContatos, listarFavorecidos } from "@/modules/contatos/servico";
import {
  categoriasDemo,
  centrosDeCustoDemo,
  contasBancariasDemo,
  contatosDemo,
} from "@/modules/demo/dados";
import { comQuedaParaDemo } from "@/modules/demo/modo";

export default async function NovoRecebimentoPage() {
  const sessao = await exigirSessaoOuRedirecionar();

  const [contatos, favorecidos, categorias, centros, contas] = await Promise.all([
    comQuedaParaDemo(() => listarContatos(sessao.organizacaoId), contatosDemo),
    comQuedaParaDemo(
      () => listarFavorecidos(sessao.organizacaoId),
      () =>
        contatosDemo
          .filter((c) => c.ativo && c.papeis.includes("FAVORECIDO"))
          .map((c) => ({ id: c.id, nome: c.nome, documento: c.documento })),
    ),
    comQuedaParaDemo(
      () => listarCategoriasPlanas(sessao.organizacaoId, "RECEITA"),
      () =>
        categoriasDemo
          .filter((c) => c.tipo === "RECEITA")
          .flatMap((c) => [
            { id: c.id, tipo: c.tipo, nome: c.nome },
            ...c.subcategorias.map((s) => ({
              id: s.id,
              tipo: c.tipo,
              nome: `${c.nome} › ${s.nome}`,
            })),
          ]),
    ),
    comQuedaParaDemo(() => listarCentrosDeCusto(sessao.organizacaoId), centrosDeCustoDemo),
    comQuedaParaDemo(
      () => listarContasProprias(sessao.organizacaoId),
      () => contasBancariasDemo.filter((c) => c.natureza === "PROPRIA"),
    ),
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
