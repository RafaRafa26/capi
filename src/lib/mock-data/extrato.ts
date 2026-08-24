export type LancamentoExtrato = {
  data: string;
  descricao: string;
  categoria?: string;
  entrada?: number;
  saida?: number;
  saldo: number;
};

export const extratoContaPrincipal: LancamentoExtrato[] = [
  { data: "01/08", descricao: "Saldo anterior", saldo: 9854000 },
  {
    data: "02/08",
    descricao: "Parcela 5/10 - Contrato 2026-000000",
    categoria: "Receita com vendas",
    entrada: 981240,
    saldo: 10835240,
  },
  {
    data: "04/08",
    descricao: "Pagamento fornecedor - NF 3421",
    categoria: "Insumos agrícolas",
    saida: 423000,
    saldo: 10412240,
  },
  {
    data: "05/08",
    descricao: "Repasse ref. vendas Julho",
    categoria: "Repasses",
    saida: 897000,
    saldo: 9515240,
  },
  {
    data: "07/08",
    descricao: "Venda de gado - Lote 47",
    categoria: "Receita com vendas",
    entrada: 3250000,
    saldo: 12765240,
  },
  {
    data: "08/08",
    descricao: "Parcela 7/10 - Contrato 2026-000000",
    categoria: "Receita com vendas",
    entrada: 1245000,
    saldo: 14010240,
  },
  {
    data: "10/08",
    descricao: "Combustível e manutenção",
    categoria: "Despesas operacionais",
    saida: 328000,
    saldo: 13682240,
  },
  {
    data: "12/08",
    descricao: "Folha de pagamento Agosto",
    categoria: "Pessoal",
    saida: 1845000,
    saldo: 11837240,
  },
  {
    data: "14/08",
    descricao: "Venda de leite - Agosto",
    categoria: "Receita com vendas",
    entrada: 1568000,
    saldo: 13405240,
  },
  {
    data: "17/08",
    descricao: "Arrendamento terras - Parcela 8",
    categoria: "Arrendamento",
    entrada: 877827,
    saldo: 14283067,
  },
];
