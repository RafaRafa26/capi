export type FavorecidoRepasse = {
  id: string;
  nome: string;
  documento: string;
  disponivel: number;
  pendente: number;
  realizado: number;
};

export const favorecidosRepasse: FavorecidoRepasse[] = [
  {
    id: "1",
    nome: "Fazenda Santa Rita",
    documento: "12.345.678/0001-90",
    disponivel: 3573000,
    pendente: 657000,
    realizado: 8840000,
  },
  {
    id: "2",
    nome: "Fazenda Boa Esperança",
    documento: "98.765.432/0001-10",
    disponivel: 1891240,
    pendente: 0,
    realizado: 2415000,
  },
  {
    id: "3",
    nome: "João B. Nogueira",
    documento: "123.456.789-00",
    disponivel: 1200000,
    pendente: 0,
    realizado: 4000000,
  },
  {
    id: "4",
    nome: "Fazenda São Judas",
    documento: "45.678.912/0001-33",
    disponivel: 0,
    pendente: 745000,
    realizado: 1530000,
  },
  {
    id: "5",
    nome: "Marcos Vieira",
    documento: "987.654.321-00",
    disponivel: 324050,
    pendente: 0,
    realizado: 1400000,
  },
];
