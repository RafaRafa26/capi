export type TipoPessoa = "FISICA" | "JURIDICA";
export type PapelContato = "PAGADOR" | "FAVORECIDO" | "FORNECEDOR";
export type SituacaoContato = "ATIVO" | "INATIVO";

export const papelLabel: Record<PapelContato, string> = {
  PAGADOR: "Pagador",
  FAVORECIDO: "Favorecido",
  FORNECEDOR: "Fornecedor",
};

export type Contato = {
  id: string;
  nome: string;
  tipoPessoa: TipoPessoa;
  documento: string;
  papeis: PapelContato[];
  situacao: SituacaoContato;
  telefone?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  banco?: string;
  tipoConta?: string;
  agencia?: string;
  conta?: string;
  tipoChavePix?: string;
  chavePix?: string;
};

export const contatos: Contato[] = [
  {
    id: "1",
    nome: "Agropecuária Santa Helena Ltda",
    tipoPessoa: "JURIDICA",
    documento: "12.345.678/0001-90",
    papeis: ["FORNECEDOR", "FAVORECIDO"],
    situacao: "ATIVO",
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
    id: "2",
    nome: "João Francisco da Silva",
    tipoPessoa: "FISICA",
    documento: "123.456.789-00",
    papeis: ["PAGADOR", "FAVORECIDO"],
    situacao: "ATIVO",
    telefone: "(34) 99876-5432",
    email: "joao.silva@fazendaboa.com.br",
    cidade: "Uberaba",
    estado: "MG",
    banco: "Banco do Brasil (001)",
    agencia: "4567",
    conta: "12345-6",
    tipoConta: "Conta corrente",
    tipoChavePix: "CPF",
    chavePix: "123.456.789-00",
  },
  {
    id: "3",
    nome: "Sementes Cerrado S/A",
    tipoPessoa: "JURIDICA",
    documento: "23.456.789/0001-01",
    papeis: ["FORNECEDOR"],
    situacao: "ATIVO",
    telefone: "(34) 3221-9900",
    email: "financeiro@sementescerrado.com.br",
    cidade: "Araxá",
    estado: "MG",
  },
  {
    id: "4",
    nome: "Fazenda São Judas Tadeu",
    tipoPessoa: "JURIDICA",
    documento: "34.567.890/0001-12",
    papeis: ["FAVORECIDO"],
    situacao: "ATIVO",
    cidade: "Patrocínio",
    estado: "MG",
  },
  {
    id: "5",
    nome: "Marcos Vieira da Silva",
    tipoPessoa: "FISICA",
    documento: "234.567.890-11",
    papeis: ["PAGADOR", "FAVORECIDO"],
    situacao: "ATIVO",
    telefone: "(34) 98765-4321",
    cidade: "Uberlândia",
    estado: "MG",
  },
  {
    id: "6",
    nome: "Cooperativa Vale do Rio Verde",
    tipoPessoa: "JURIDICA",
    documento: "45.678.901/0001-23",
    papeis: ["FORNECEDOR", "PAGADOR"],
    situacao: "INATIVO",
    cidade: "Frutal",
    estado: "MG",
  },
  {
    id: "7",
    nome: "Ana Paula Rezende",
    tipoPessoa: "FISICA",
    documento: "345.678.901-22",
    papeis: ["FAVORECIDO"],
    situacao: "ATIVO",
    telefone: "(34) 99123-4567",
    cidade: "Uberaba",
    estado: "MG",
  },
  {
    id: "8",
    nome: "Distribuidora de Adubos Triângulo",
    tipoPessoa: "JURIDICA",
    documento: "56.789.012/0001-34",
    papeis: ["FORNECEDOR"],
    situacao: "ATIVO",
    cidade: "Uberaba",
    estado: "MG",
  },
  {
    id: "9",
    nome: "Fazenda Boa Esperança",
    tipoPessoa: "JURIDICA",
    documento: "67.890.123/0001-45",
    papeis: ["FAVORECIDO"],
    situacao: "ATIVO",
    cidade: "Iturama",
    estado: "MG",
  },
  {
    id: "10",
    nome: "Carlos Henrique Souza",
    tipoPessoa: "FISICA",
    documento: "456.789.012-33",
    papeis: ["PAGADOR"],
    situacao: "INATIVO",
    cidade: "Ituiutaba",
    estado: "MG",
  },
];

export function getContatoById(id: string) {
  return contatos.find((contato) => contato.id === id);
}
