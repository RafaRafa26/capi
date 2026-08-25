import "dotenv/config";

import { prismaAdmin } from "@/db/client";

// Apoio para os testes que tocam o banco de verdade.
//
// Rodam contra o Postgres de desenvolvimento, num par de organizações
// descartáveis criadas e destruídas por arquivo de teste. Testar as regras de
// custódia contra banco real (e não contra dublê) é o que dá confiança de que
// transação, restrição única e RLS estão de fato fazendo o trabalho deles —
// justamente o que o ARQUITETURA.md §9 elege como riscos principais.

export type OrgDeTeste = {
  id: string;
  usuarioId: string;
  contaPropriaId: string;
  contaTerceiroId: string;
  categoriaReceitaId: string;
  categoriaDespesaId: string;
  favorecidoAId: string;
  favorecidoBId: string;
  pagadorId: string;
};

let contador = 0;

export async function criarOrganizacaoDeTeste(rotulo: string): Promise<OrgDeTeste> {
  contador += 1;
  const sufixo = `${Date.now()}-${contador}`;

  const org = await prismaAdmin.organizacao.create({
    data: { nome: `Teste ${rotulo}`, documento: `doc-teste-${sufixo}` },
  });

  const usuario = await prismaAdmin.usuario.create({
    data: {
      organizacaoId: org.id,
      nome: "Usuário de Teste",
      email: `teste-${sufixo}@exemplo.test`,
      senhaHash: "nao-usado",
    },
  });

  const contaPropria = await prismaAdmin.contaBancaria.create({
    data: {
      organizacaoId: org.id,
      nome: "Conta Própria",
      banco: "Banco de Teste",
      agencia: "0001",
      conta: "1111-1",
      natureza: "PROPRIA",
      saldoInicial: 0,
    },
  });

  const contaTerceiro = await prismaAdmin.contaBancaria.create({
    data: {
      organizacaoId: org.id,
      nome: "Conta de Terceiro",
      banco: "Banco de Teste",
      agencia: "0002",
      conta: "2222-2",
      natureza: "TERCEIRO",
      saldoInicial: 0,
    },
  });

  const categoriaReceita = await prismaAdmin.categoria.create({
    data: { organizacaoId: org.id, nome: "Receita de Teste", tipo: "RECEITA" },
  });
  const categoriaDespesa = await prismaAdmin.categoria.create({
    data: { organizacaoId: org.id, nome: "Despesa de Teste", tipo: "DESPESA" },
  });

  const favorecidoA = await prismaAdmin.contato.create({
    data: {
      organizacaoId: org.id,
      nome: "Favorecido A",
      tipoPessoa: "JURIDICA",
      documento: `fav-a-${sufixo}`,
      papeis: ["FAVORECIDO"],
    },
  });
  const favorecidoB = await prismaAdmin.contato.create({
    data: {
      organizacaoId: org.id,
      nome: "Favorecido B",
      tipoPessoa: "JURIDICA",
      documento: `fav-b-${sufixo}`,
      papeis: ["FAVORECIDO"],
    },
  });
  const pagador = await prismaAdmin.contato.create({
    data: {
      organizacaoId: org.id,
      nome: "Pagador",
      tipoPessoa: "FISICA",
      documento: `pag-${sufixo}`,
      papeis: ["PAGADOR"],
    },
  });

  return {
    id: org.id,
    usuarioId: usuario.id,
    contaPropriaId: contaPropria.id,
    contaTerceiroId: contaTerceiro.id,
    categoriaReceitaId: categoriaReceita.id,
    categoriaDespesaId: categoriaDespesa.id,
    favorecidoAId: favorecidoA.id,
    favorecidoBId: favorecidoB.id,
    pagadorId: pagador.id,
  };
}

export async function removerOrganizacoesDeTeste(ids: string[]) {
  for (const id of ids) {
    await prismaAdmin.organizacao.delete({ where: { id } }).catch(() => {});
  }
}
