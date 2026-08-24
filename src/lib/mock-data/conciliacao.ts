export type TipoTransacao = "ENTRADA" | "SAIDA";

export type TransacaoOfx = {
  descricao: string;
  data: string;
  tipo: TipoTransacao;
  valor: number;
};

export type LancamentoCandidato = {
  descricao: string;
  contato: string;
  data: string;
  categoria: string;
  valor: number;
};

export type ItemConciliacao = {
  id: string;
  ofx: TransacaoOfx;
  match?: LancamentoCandidato;
  criarTipoSugerido?: "PAGAMENTO" | "TRANSFERENCIA";
};

export const itensConciliacao: ItemConciliacao[] = [
  {
    id: "1",
    ofx: { descricao: "TED RECEB JOAO FRANCISCO SILVA", data: "2026-08-05", tipo: "ENTRADA", valor: 981240 },
    match: {
      descricao: "Parcela 5/10 - Contrato 2026-0001",
      contato: "Fazenda Boa Esperança",
      data: "2026-08-08",
      categoria: "Receitas com vendas",
      valor: 981240,
    },
  },
  {
    id: "2",
    ofx: { descricao: "PIX RECEB AGROPECUARIA BOM RETIRO", data: "2026-08-06", tipo: "ENTRADA", valor: 423000 },
    match: {
      descricao: "Arrendamento terras - Parcela 6",
      contato: "Agropecuária Bom Retiro",
      data: "2026-08-10",
      categoria: "Receitas com vendas",
      valor: 423000,
    },
  },
  {
    id: "3",
    ofx: { descricao: "PAG BOLETO FORNEC AGROINSUMOS LTDA", data: "2026-08-07", tipo: "SAIDA", valor: 423000 },
    criarTipoSugerido: "PAGAMENTO",
  },
  {
    id: "4",
    ofx: { descricao: "TED ENVIADA FAZENDA SANTA RITA", data: "2026-08-05", tipo: "SAIDA", valor: 897000 },
    match: {
      descricao: "Repasse ref. vendas Julho",
      contato: "Fazenda Santa Rita",
      data: "2026-08-05",
      categoria: "Repasses",
      valor: 897000,
    },
  },
  {
    id: "5",
    ofx: { descricao: "TRANSF ENTRE CONTAS MESMA TITULARIDADE", data: "2026-08-07", tipo: "SAIDA", valor: 500000 },
    criarTipoSugerido: "TRANSFERENCIA",
  },
];
