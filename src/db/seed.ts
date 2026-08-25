import "dotenv/config";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash as argonHash } from "@node-rs/argon2";

import { PrismaClient } from "./generated/client";

// Seed de desenvolvimento. Roda no papel dono do banco, ignorando RLS de
// propósito — é o único jeito de criar a primeira organização, que ainda não
// tem ninguém logado para declarar contexto.
//
// Idempotente: apaga a organização de demonstração e a recria, para poder
// rodar quantas vezes for preciso sem duplicar nada.

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DOCUMENTO_DEMO = "12.345.678/0001-90";

const categoriasSeed = [
  {
    nome: "Receita com vendas",
    tipo: "RECEITA" as const,
    filhas: ["Venda de grãos", "Venda de gado", "Venda de leite", "Venda de café"],
  },
  {
    nome: "Receita com serviços",
    tipo: "RECEITA" as const,
    filhas: ["Arrendamento a terceiros", "Prestação de serviços", "Aluguel de máquinas"],
  },
  {
    nome: "Outras receitas",
    tipo: "RECEITA" as const,
    filhas: ["Juros e rendimentos", "Recuperação de créditos", "Receitas eventuais"],
  },
  {
    nome: "Arrendamento e aluguel",
    tipo: "DESPESA" as const,
    filhas: ["Arrendamento de terras", "Aluguel de máquinas"],
  },
  {
    nome: "Insumos agrícolas",
    tipo: "DESPESA" as const,
    filhas: ["Sementes", "Fertilizantes e defensivos"],
  },
  {
    nome: "Despesas operacionais",
    tipo: "DESPESA" as const,
    filhas: ["Combustível e manutenção", "Pessoal"],
  },
  { nome: "Repasses a favorecidos", tipo: "DESPESA" as const, filhas: [] },
  { nome: "Taxas e tarifas bancárias", tipo: "DESPESA" as const, filhas: [] },
];

const contatosSeed = [
  {
    nome: "Agropecuária Santa Helena Ltda",
    tipoPessoa: "JURIDICA" as const,
    documento: "12.345.678/0001-90",
    papeis: ["FORNECEDOR", "FAVORECIDO"] as const,
    telefone: "(34) 3312-4455",
    email: "contato@santahelena.com.br",
    cidade: "Uberaba",
    estado: "MG",
    banco: "Banco do Brasil (001)",
    agencia: "4567",
    conta: "12345-6",
    tipoConta: "Conta corrente",
  },
  {
    nome: "João Francisco da Silva",
    tipoPessoa: "FISICA" as const,
    documento: "123.456.789-00",
    papeis: ["PAGADOR", "FAVORECIDO"] as const,
    cidade: "Uberlândia",
    estado: "MG",
  },
  {
    nome: "Sementes Cerrado S/A",
    tipoPessoa: "JURIDICA" as const,
    documento: "23.456.789/0001-01",
    papeis: ["FORNECEDOR"] as const,
    cidade: "Patos de Minas",
    estado: "MG",
  },
  {
    nome: "Fazenda São Judas Tadeu",
    tipoPessoa: "JURIDICA" as const,
    documento: "34.567.890/0001-12",
    papeis: ["FAVORECIDO"] as const,
    cidade: "Araguari",
    estado: "MG",
  },
  {
    nome: "Marcos Vieira da Silva",
    tipoPessoa: "FISICA" as const,
    documento: "234.567.890-11",
    papeis: ["PAGADOR", "FAVORECIDO"] as const,
    cidade: "Uberaba",
    estado: "MG",
  },
  {
    nome: "Cooperativa Vale do Rio Verde",
    tipoPessoa: "JURIDICA" as const,
    documento: "45.678.901/0001-23",
    papeis: ["FORNECEDOR", "PAGADOR"] as const,
    cidade: "Rio Verde",
    estado: "GO",
  },
  {
    nome: "Ana Paula Rezende",
    tipoPessoa: "FISICA" as const,
    documento: "345.678.901-22",
    papeis: ["FAVORECIDO"] as const,
    cidade: "Uberlândia",
    estado: "MG",
  },
  {
    nome: "Fazenda Boa Esperança",
    tipoPessoa: "JURIDICA" as const,
    documento: "67.890.123/0001-45",
    papeis: ["FAVORECIDO"] as const,
    cidade: "Monte Alegre de Minas",
    estado: "MG",
  },
  {
    nome: "Carlos Henrique Souza",
    tipoPessoa: "FISICA" as const,
    documento: "456.789.012-33",
    papeis: ["PAGADOR"] as const,
    cidade: "Tupaciguara",
    estado: "MG",
  },
];

async function main() {
  const anterior = await prisma.organizacao.findFirst({
    where: { documento: DOCUMENTO_DEMO },
  });
  if (anterior) {
    await prisma.organizacao.delete({ where: { id: anterior.id } });
    console.log("· organização de demonstração anterior removida");
  }

  const org = await prisma.organizacao.create({
    data: { nome: "Capi HUB", documento: DOCUMENTO_DEMO },
  });
  console.log(`· organização "${org.nome}" criada`);

  await prisma.usuario.create({
    data: {
      organizacaoId: org.id,
      nome: "Rafael Arantes",
      email: "rafael@email.com",
      senhaHash: await argonHash("capi1234"),
      papel: "ADMIN",
    },
  });
  console.log("· usuário rafael@email.com criado (senha: capi1234)");

  for (const c of categoriasSeed) {
    const pai = await prisma.categoria.create({
      data: { organizacaoId: org.id, nome: c.nome, tipo: c.tipo },
    });
    for (const nome of c.filhas) {
      await prisma.categoria.create({
        data: { organizacaoId: org.id, nome, tipo: c.tipo, paiId: pai.id },
      });
    }
  }
  console.log(`· ${categoriasSeed.length} categorias (com subcategorias) criadas`);

  await prisma.contaBancaria.createMany({
    data: [
      {
        organizacaoId: org.id,
        nome: "Conta Principal",
        banco: "Banco do Brasil",
        agencia: "4567",
        conta: "12345-6",
        natureza: "PROPRIA",
        saldoInicial: 9854000,
        dataSaldoInicial: new Date("2026-08-01"),
      },
      {
        organizacaoId: org.id,
        nome: "Conta Operacional",
        banco: "ASAAS",
        agencia: "1234",
        conta: "56789",
        natureza: "PROPRIA",
        saldoInicial: 8542030,
        dataSaldoInicial: new Date("2026-08-01"),
      },
      {
        organizacaoId: org.id,
        nome: "Conta pessoal — João Francisco",
        banco: "Sicoob",
        agencia: "3010",
        conta: "88221-4",
        natureza: "TERCEIRO",
        saldoInicial: 0,
      },
    ],
  });
  console.log("· 3 contas bancárias criadas (2 próprias, 1 de terceiro)");

  for (const nome of [
    "Fazenda Boa Esperança",
    "Fazenda Santa Rita",
    "Agropecuária Bom Retiro",
    "Unidade de Beneficiamento",
    "Escritório Central",
    "Transporte e Logística",
  ]) {
    await prisma.centroCusto.create({ data: { organizacaoId: org.id, nome } });
  }
  console.log("· 6 centros de custo criados");

  for (const c of contatosSeed) {
    await prisma.contato.create({
      data: { organizacaoId: org.id, ...c, papeis: [...c.papeis] },
    });
  }
  console.log(`· ${contatosSeed.length} contatos criados`);

  console.log("\nSeed concluído. Entre com rafael@email.com / capi1234");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
