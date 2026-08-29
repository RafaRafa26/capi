// Dados de demonstração para o MODO DEMO (ver src/modules/demo/modo.ts).
//
// Usados apenas quando não há banco alcançável: assim o app abre e pode ser
// navegado inteiro — em preview, em avaliação, numa máquina sem Postgres.
// Com banco configurado, nada aqui é lido.
//
// Valores em centavos, como no resto do sistema (AD-07).

import type { Contato } from "@/modules/contatos/tipos";
import type { CategoriaArvore } from "@/modules/categorias/servico";
import type { CentroCusto } from "@/modules/centros-de-custo/servico";
import type { ContaBancaria } from "@/modules/contas-bancarias/tipos";
import type { PosicaoFavorecido } from "@/modules/custodia/tipos";
import type { LancamentoDaLista } from "@/modules/lancamentos/tipos";
import type {
  MesRecebimento,
  PontoFluxoCaixa,
  ResumoDashboard,
} from "@/modules/dashboard/servico";
import type { LinhaExtrato } from "@/modules/extrato/servico";

export const ORGANIZACAO_DEMO = {
  id: "00000000-0000-4000-8000-000000000001",
  nome: "Capi HUB",
  documento: "12.345.678/0001-90",
};

export const USUARIO_DEMO = {
  id: "00000000-0000-4000-8000-000000000002",
  nome: "Rafael Arantes",
  email: "rafael@email.com",
};

// ------------------------------------------------------------------ contatos

export const contatosDemo: Contato[] = [
  {
    id: "c1", nome: "Agropecuária Santa Helena Ltda", tipoPessoa: "JURIDICA",
    documento: "12.345.678/0001-90", papeis: ["FORNECEDOR", "FAVORECIDO"], ativo: true,
    telefone: "(34) 3312-4455", email: "contato@santahelena.com.br",
    cidade: "Uberaba", estado: "MG", banco: "Banco do Brasil (001)",
    tipoConta: "Conta corrente", agencia: "4567", conta: "12345-6",
    tipoChavePix: "CNPJ", chavePix: "12.345.678/0001-90",
  },
  {
    id: "c2", nome: "João Francisco da Silva", tipoPessoa: "FISICA",
    documento: "123.456.789-00", papeis: ["PAGADOR", "FAVORECIDO"], ativo: true,
    telefone: "(34) 99812-3344", email: "joao.francisco@email.com",
    cidade: "Uberlândia", estado: "MG", banco: "Sicoob",
    tipoConta: "Conta corrente", agencia: "3010", conta: "88221-4",
    tipoChavePix: "CPF", chavePix: "123.456.789-00",
  },
  {
    id: "c3", nome: "Sementes Cerrado S/A", tipoPessoa: "JURIDICA",
    documento: "23.456.789/0001-01", papeis: ["FORNECEDOR"], ativo: true,
    telefone: "(34) 3421-8800", email: null, cidade: "Patos de Minas", estado: "MG",
    banco: null, tipoConta: null, agencia: null, conta: null,
    tipoChavePix: null, chavePix: null,
  },
  {
    id: "c4", nome: "Fazenda São Judas Tadeu", tipoPessoa: "JURIDICA",
    documento: "34.567.890/0001-12", papeis: ["FAVORECIDO"], ativo: true,
    telefone: null, email: null, cidade: "Araguari", estado: "MG",
    banco: "Itaú", tipoConta: "Conta corrente", agencia: "1544", conta: "09912-3",
    tipoChavePix: null, chavePix: null,
  },
  {
    id: "c5", nome: "Marcos Vieira da Silva", tipoPessoa: "FISICA",
    documento: "234.567.890-11", papeis: ["PAGADOR", "FAVORECIDO"], ativo: true,
    telefone: "(34) 98877-1122", email: null, cidade: "Uberaba", estado: "MG",
    banco: null, tipoConta: null, agencia: null, conta: null,
    tipoChavePix: "Telefone", chavePix: "(34) 98877-1122",
  },
  {
    id: "c6", nome: "Cooperativa Vale do Rio Verde", tipoPessoa: "JURIDICA",
    documento: "45.678.901/0001-23", papeis: ["FORNECEDOR", "PAGADOR"], ativo: true,
    telefone: null, email: "financeiro@valeriverde.coop.br",
    cidade: "Rio Verde", estado: "GO",
    banco: null, tipoConta: null, agencia: null, conta: null,
    tipoChavePix: null, chavePix: null,
  },
  {
    id: "c7", nome: "Ana Paula Rezende", tipoPessoa: "FISICA",
    documento: "345.678.901-22", papeis: ["FAVORECIDO"], ativo: true,
    telefone: null, email: null, cidade: "Uberlândia", estado: "MG",
    banco: null, tipoConta: null, agencia: null, conta: null,
    tipoChavePix: null, chavePix: null,
  },
  {
    id: "c8", nome: "Fazenda Boa Esperança", tipoPessoa: "JURIDICA",
    documento: "67.890.123/0001-45", papeis: ["FAVORECIDO"], ativo: true,
    telefone: null, email: null, cidade: "Monte Alegre de Minas", estado: "MG",
    banco: "Bradesco", tipoConta: "Conta corrente", agencia: "2210", conta: "44551-0",
    tipoChavePix: null, chavePix: null,
  },
  {
    id: "c9", nome: "Carlos Henrique Souza", tipoPessoa: "FISICA",
    documento: "456.789.012-33", papeis: ["PAGADOR"], ativo: false,
    telefone: null, email: null, cidade: "Tupaciguara", estado: "MG",
    banco: null, tipoConta: null, agencia: null, conta: null,
    tipoChavePix: null, chavePix: null,
  },
];

// -------------------------------------------------------- contas bancárias

export const contasBancariasDemo: ContaBancaria[] = [
  {
    id: "b1", nome: "Conta Principal", banco: "Banco do Brasil",
    agencia: "4567", conta: "12345-6", natureza: "PROPRIA",
    saldoInicial: 9854000, dataSaldoInicial: "2026-08-01", ativa: true,
  },
  {
    id: "b2", nome: "Conta Operacional", banco: "ASAAS",
    agencia: "1234", conta: "56789", natureza: "PROPRIA",
    saldoInicial: 8542030, dataSaldoInicial: "2026-08-01", ativa: true,
  },
  {
    id: "b3", nome: "Conta pessoal — João Francisco", banco: "Sicoob",
    agencia: "3010", conta: "88221-4", natureza: "TERCEIRO",
    saldoInicial: 0, dataSaldoInicial: null, ativa: true,
  },
];

// --------------------------------------------------------------- categorias

const arvore = (
  id: string,
  nome: string,
  tipo: "RECEITA" | "DESPESA",
  filhas: string[],
): CategoriaArvore => ({
  id, nome, tipo, ativa: true,
  subcategorias: filhas.map((f, i) => ({
    id: `${id}-${i}`, nome: f, ativa: true,
  })),
});

export const categoriasDemo: CategoriaArvore[] = [
  arvore("k1", "Receita com vendas", "RECEITA",
    ["Venda de grãos", "Venda de gado", "Venda de leite", "Venda de café"]),
  arvore("k2", "Receita com serviços", "RECEITA",
    ["Arrendamento a terceiros", "Prestação de serviços", "Aluguel de máquinas"]),
  arvore("k3", "Outras receitas", "RECEITA",
    ["Juros e rendimentos", "Recuperação de créditos", "Receitas eventuais"]),
  arvore("k4", "Arrendamento e aluguel", "DESPESA",
    ["Arrendamento de terras", "Aluguel de máquinas"]),
  arvore("k5", "Insumos agrícolas", "DESPESA",
    ["Sementes", "Fertilizantes e defensivos"]),
  arvore("k6", "Despesas operacionais", "DESPESA",
    ["Combustível e manutenção", "Pessoal"]),
  arvore("k7", "Repasses a favorecidos", "DESPESA", []),
  arvore("k8", "Taxas e tarifas bancárias", "DESPESA", []),
];

export const centrosDeCustoDemo: CentroCusto[] = [
  { id: "cc1", nome: "Fazenda Boa Esperança", ativo: true },
  { id: "cc2", nome: "Fazenda Santa Rita", ativo: true },
  { id: "cc3", nome: "Agropecuária Bom Retiro", ativo: true },
  { id: "cc4", nome: "Unidade de Beneficiamento", ativo: true },
  { id: "cc5", nome: "Escritório Central", ativo: true },
  { id: "cc6", nome: "Transporte e Logística", ativo: true },
  { id: "cc7", nome: "Confinamento Nelore", ativo: false },
];

// -------------------------------------------------------------- lançamentos

export const contasAReceberDemo: LancamentoDaLista[] = [
  { id: "l1", vencimento: "2026-08-05", contato: "João Francisco da Silva",
    descricao: "Parcela 7/10 — Contrato 2026-0001", categoria: "Venda de gado",
    valorPrevisto: 1245000, valorLiquidado: 0, status: "PREVISTO", situacao: "VENCIDO" },
  { id: "l2", vencimento: "2026-08-10", contato: "Marcos Vieira da Silva",
    descricao: "Parcela 5/10 — Contrato 2026-0002", categoria: "Venda de gado",
    valorPrevisto: 981240, valorLiquidado: 0, status: "PREVISTO", situacao: "VENCIDO" },
  { id: "l3", vencimento: "2026-08-15", contato: "Cooperativa Vale do Rio Verde",
    descricao: "Arrendamento de terras — Ago/26", categoria: "Arrendamento a terceiros",
    valorPrevisto: 223760, valorLiquidado: 0, status: "PREVISTO", situacao: "VENCIDO" },
  { id: "l4", vencimento: "2026-08-25", contato: "Ana Paula Rezende",
    descricao: "Venda de gado — Lote 52", categoria: "Venda de gado",
    valorPrevisto: 820000, valorLiquidado: 0, status: "PREVISTO", situacao: "VENCE_HOJE" },
  { id: "l5", vencimento: "2026-09-05", contato: "João Francisco da Silva",
    descricao: "Parcela 8/10 — Contrato 2026-0001", categoria: "Venda de gado",
    valorPrevisto: 1245000, valorLiquidado: 0, status: "PREVISTO", situacao: "A_VENCER" },
  { id: "l6", vencimento: "2026-09-12", contato: "Cooperativa Vale do Rio Verde",
    descricao: "Venda de café — Lote 8", categoria: "Venda de café",
    valorPrevisto: 4532000, valorLiquidado: 0, status: "PREVISTO", situacao: "A_VENCER" },
  { id: "l7", vencimento: "2026-09-20", contato: "Marcos Vieira da Silva",
    descricao: "Venda de leite — Set/26", categoria: "Venda de leite",
    valorPrevisto: 1568000, valorLiquidado: 0, status: "PREVISTO", situacao: "A_VENCER" },
  { id: "l8", vencimento: "2026-08-05", contato: "João Francisco da Silva",
    descricao: "Parcela 6/10 — Contrato 2026-0001", categoria: "Venda de gado",
    valorPrevisto: 1245000, valorLiquidado: 1245000, status: "LIQUIDADO", situacao: "LIQUIDADO" },
];

/** Lançamentos em aberto — candidatos da tela de conciliação. */
export const lancamentosEmAbertoDemo = contasAReceberDemo
  .filter((l) => l.status !== "LIQUIDADO")
  .map((l) => ({
    id: l.id,
    tipo: "RECEBIMENTO" as const,
    vencimento: l.vencimento,
    descricao: l.descricao,
    contato: l.contato,
    categoria: l.categoria,
    valorPrevisto: l.valorPrevisto,
    emAberto: l.valorPrevisto - l.valorLiquidado,
  }));

// ------------------------------------------------------------- conciliação

/** Contatos no formato dos <select> da tela de conciliação. */
export const contatosSelecaoDemo = contatosDemo.map((c) => ({
  id: c.id,
  nome: c.nome,
}));

export const contasPropriasDemo = contasBancariasDemo
  .filter((c) => c.natureza === "PROPRIA")
  .map((c) => ({ id: c.id, nome: c.nome, banco: c.banco }));

/** Categorias achatadas (pai › filha), como `listarCategoriasPlanas` devolve. */
export const categoriasPlanasDemo = categoriasDemo.flatMap((c) => [
  { id: c.id, tipo: c.tipo, nome: c.nome },
  ...c.subcategorias.map((s) => ({
    id: s.id,
    tipo: c.tipo,
    nome: `${c.nome} › ${s.nome}`,
  })),
]);

/** Lançamentos em aberto — candidatos do lado direito da conciliação. */
export const candidatosDemo = [
  {
    id: "l1",
    tipo: "RECEBIMENTO" as const,
    vencimento: "2026-08-08",
    descricao: "Parcela 7/10 — Contrato 2026-000000",
    contato: "João Francisco da Silva",
    categoria: "Receita com vendas › Venda de gado",
    favorecido: "Fazenda Boa Esperança",
    valorPrevisto: 1245000,
    emAberto: 1245000,
  },
  {
    id: "l2",
    tipo: "RECEBIMENTO" as const,
    vencimento: "2026-08-10",
    descricao: "Parcela 5/10 — Contrato 2026-000000",
    contato: "Marcos Vieira da Silva",
    categoria: "Receita com vendas › Venda de gado",
    favorecido: "Agropecuária Bom Retiro",
    valorPrevisto: 981240,
    emAberto: 981240,
  },
  {
    id: "l3",
    tipo: "PAGAMENTO" as const,
    vencimento: "2026-08-05",
    descricao: "REPASSE ref. vendas de julho",
    contato: "Fazenda Santa Rita",
    categoria: "Repasses a favorecidos",
    favorecido: "Fazenda Santa Rita",
    valorPrevisto: 897000,
    emAberto: 897000,
  },
];

/** As transações do extrato, com o par que o sistema sugere para cada uma. */
export const paresConciliacaoDemo = [
  {
    transacao: {
      id: "t1",
      data: "2026-08-05",
      descricao: "Cobrança recebida - fatura nr. xxxxxxxx JOÃO FRANCISCO DA SILVA",
      valor: 1245000,
      contaId: "b2",
      contaNome: "Conta Operacional",
    },
    sugestao: candidatosDemo[0],
  },
  {
    transacao: {
      id: "t2",
      data: "2026-08-06",
      descricao: "Cobrança recebida - fatura nr. xxxxxxxx MARCOS VIEIRA DA SILVA",
      valor: 981240,
      contaId: "b2",
      contaNome: "Conta Operacional",
    },
    sugestao: candidatosDemo[1],
  },
  {
    // Sem par: taxa do banco, que o operador classifica na hora (RN-14).
    transacao: {
      id: "t3",
      data: "2026-08-07",
      descricao: "Taxa de boleto - fatura nr. XXXXXXXX MARCOS VIEIRA DA SILVA",
      valor: -199,
      contaId: "b2",
      contaNome: "Conta Operacional",
    },
    sugestao: null,
  },
  {
    transacao: {
      id: "t4",
      data: "2026-08-05",
      descricao: "Transação via Pix com chave para FAZENDA SANTA RITA",
      valor: -897000,
      contaId: "b2",
      contaNome: "Conta Operacional",
    },
    sugestao: candidatosDemo[2],
  },
  {
    // Sem par: transferência entre contas próprias (RN-15).
    transacao: {
      id: "t5",
      data: "2026-08-07",
      descricao: "Transação via Pix com chave para AGROPECUARIA BOI SOBERANO",
      valor: -350000,
      contaId: "b2",
      contaNome: "Conta Operacional",
    },
    sugestao: null,
  },
];

// ------------------------------------------------------------------ extrato

const linhasExtrato: Omit<LinhaExtrato, "saldo">[] = [
  { id: "e1", data: "2026-08-02", descricao: "Parcela 6/10 — Contrato 2026-0001", valor: 1245000, status: "CONCILIADA" },
  { id: "e2", data: "2026-08-04", descricao: "Pagamento fornecedor — NF 3380", valor: -423000, status: "CONCILIADA" },
  { id: "e3", data: "2026-08-05", descricao: "TED RECEB JOAO FRANCISCO SILVA", valor: 1245000, status: "PENDENTE" },
  { id: "e4", data: "2026-08-07", descricao: "Venda de gado — Lote 47", valor: 3250000, status: "CONCILIADA" },
  { id: "e5", data: "2026-08-10", descricao: "PIX RECEB MARCOS VIEIRA", valor: 981240, status: "PENDENTE" },
  { id: "e6", data: "2026-08-12", descricao: "PAGAMENTO FORNECEDOR NF 3421", valor: -423000, status: "PENDENTE" },
  { id: "e7", data: "2026-08-14", descricao: "Repasse ref. vendas Julho", valor: -897000, status: "CONCILIADA" },
  { id: "e8", data: "2026-08-15", descricao: "TARIFA MENSAL PACOTE", valor: -1290, status: "PENDENTE" },
];

export function extratoDemo(saldoInicial = 8542030) {
  let saldo = saldoInicial;
  const linhas: LinhaExtrato[] = [];
  for (const l of linhasExtrato) {
    saldo += l.valor;
    linhas.push({ ...l, saldo });
  }
  return { linhas, saldoInicial, saldoFinal: saldo };
}

// ----------------------------------------------------------------- repasses

export const posicaoFavorecidosDemo: PosicaoFavorecido[] = [
  { favorecidoId: "c8", nome: "Fazenda Boa Esperança", documento: "67.890.123/0001-45",
    creditos: 4230000, debitos: 657000, reservado: 0, disponivel: 3573000 },
  { favorecidoId: "c1", nome: "Agropecuária Santa Helena Ltda", documento: "12.345.678/0001-90",
    creditos: 2415000, debitos: 523760, reservado: 0, disponivel: 1891240 },
  { favorecidoId: "c2", nome: "João Francisco da Silva", documento: "123.456.789-00",
    creditos: 4000000, debitos: 2800000, reservado: 0, disponivel: 1200000 },
  { favorecidoId: "c4", nome: "Fazenda São Judas Tadeu", documento: "34.567.890/0001-12",
    creditos: 1530000, debitos: 785000, reservado: 745000, disponivel: 0 },
  { favorecidoId: "c5", nome: "Marcos Vieira da Silva", documento: "234.567.890-11",
    creditos: 1400000, debitos: 1075950, reservado: 0, disponivel: 324050 },
  { favorecidoId: "c7", nome: "Ana Paula Rezende", documento: "345.678.901-22",
    creditos: 0, debitos: 0, reservado: 0, disponivel: 0 },
];

// ---------------------------------------------------------------- dashboard

export const resumoDashboardDemo: ResumoDashboard = {
  contas: [
    { id: "b2", nome: "Conta Operacional", banco: "ASAAS",
      agencia: "1234", conta: "56789", saldo: 12518980 },
    { id: "b1", nome: "Conta Principal", banco: "Banco do Brasil",
      agencia: "4567", conta: "12345-6", saldo: 9854000 },
  ],
  saldoTotal: 22372980,
  aReceber: {
    vencido: { quantidade: 3, total: 2450000 },
    venceHoje: { quantidade: 1, total: 820000 },
    aVencer: { quantidade: 3, total: 7345000 },
    total: 10615000,
  },
  aPagar: {
    vencido: { quantidade: 2, total: 1287000 },
    venceHoje: { quantidade: 0, total: 0 },
    aVencer: { quantidade: 3, total: 2402000 },
    total: 3689000,
  },
};

/** Série diária de agosto, com movimento nos dias úteis. */
export const fluxoDeCaixaDemo: PontoFluxoCaixa[] = (() => {
  const movimento: Record<string, [number, number]> = {
    "2026-08-02": [1245000, 0], "2026-08-04": [0, 423000],
    "2026-08-05": [1245000, 0], "2026-08-07": [3250000, 0],
    "2026-08-10": [981240, 0], "2026-08-12": [0, 423000],
    "2026-08-14": [0, 897000], "2026-08-15": [0, 1290],
    "2026-08-18": [1568000, 0], "2026-08-20": [0, 312000],
    "2026-08-24": [820000, 0],
  };
  const serie: PontoFluxoCaixa[] = [];
  for (let dia = 1; dia <= 25; dia++) {
    const data = `2026-08-${String(dia).padStart(2, "0")}`;
    const [entradas, saidas] = movimento[data] ?? [0, 0];
    serie.push({ date: data, entradas, saidas });
  }
  return serie;
})();

export const recebimentosPorMesDemo: MesRecebimento[] = [
  { label: "set. de 25", value: 95, display: "R$ 95k" },
  { label: "out.", value: 110, display: "R$ 110k" },
  { label: "nov.", value: 135, display: "R$ 135k" },
  { label: "dez.", value: 80, display: "R$ 80k" },
  { label: "jan. de 26", value: 120, display: "R$ 120k" },
  { label: "fev.", value: 145, display: "R$ 145k" },
  { label: "mar.", value: 165, display: "R$ 165k" },
  { label: "abr.", value: 130, display: "R$ 130k" },
  { label: "mai.", value: 155, display: "R$ 155k" },
  { label: "jun.", value: 190, display: "R$ 190k" },
  { label: "jul.", value: 140, display: "R$ 140k" },
  { label: "ago.", value: 143, display: "R$ 143k", current: true },
];
