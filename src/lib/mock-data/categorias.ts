export type TipoCategoria = "RECEITA" | "DESPESA";

export type Categoria = {
  id: string;
  nome: string;
  tipo: TipoCategoria;
  subcategorias: { id: string; nome: string }[];
};

export const categorias: Categoria[] = [
  {
    id: "receita-vendas",
    nome: "Receita com vendas",
    tipo: "RECEITA",
    subcategorias: [
      { id: "venda-graos", nome: "Venda de grãos" },
      { id: "venda-gado", nome: "Venda de gado" },
      { id: "venda-leite", nome: "Venda de leite" },
      { id: "venda-cafe", nome: "Venda de café" },
    ],
  },
  {
    id: "receita-servicos",
    nome: "Receita com serviços",
    tipo: "RECEITA",
    subcategorias: [
      { id: "arrendamento-terceiros", nome: "Arrendamento a terceiros" },
      { id: "prestacao-servicos", nome: "Prestação de serviços" },
      { id: "aluguel-maquinas", nome: "Aluguel de máquinas" },
    ],
  },
  {
    id: "outras-receitas",
    nome: "Outras receitas",
    tipo: "RECEITA",
    subcategorias: [
      { id: "juros-rendimentos", nome: "Juros e rendimentos" },
      { id: "recuperacao-creditos", nome: "Recuperação de créditos" },
      { id: "receitas-eventuais", nome: "Receitas eventuais" },
    ],
  },
  {
    id: "despesa-arrendamento",
    nome: "Arrendamento e aluguel",
    tipo: "DESPESA",
    subcategorias: [
      { id: "arrendamento-terras", nome: "Arrendamento de terras" },
      { id: "aluguel-maquinas-despesa", nome: "Aluguel de máquinas" },
    ],
  },
  {
    id: "despesa-insumos",
    nome: "Insumos agrícolas",
    tipo: "DESPESA",
    subcategorias: [
      { id: "sementes", nome: "Sementes" },
      { id: "fertilizantes", nome: "Fertilizantes e defensivos" },
    ],
  },
  {
    id: "despesa-operacional",
    nome: "Despesas operacionais",
    tipo: "DESPESA",
    subcategorias: [
      { id: "combustivel", nome: "Combustível e manutenção" },
      { id: "pessoal", nome: "Pessoal" },
    ],
  },
];

export function getCategoriaById(id: string) {
  return categorias.find((categoria) => categoria.id === id);
}
