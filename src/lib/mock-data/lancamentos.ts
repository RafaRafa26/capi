export type SituacaoLancamento = "VENCIDO" | "VENCE_HOJE" | "A_VENCER" | "RECEBIDO";

export type LancamentoRecebimento = {
  id: string;
  vencimento: string;
  recebidoDe: string;
  descricao: string;
  categoria: string;
  valorPrevisto: number;
  valorRecebido?: number;
  situacao: SituacaoLancamento;
};

export const situacaoLabel: Record<SituacaoLancamento, string> = {
  VENCIDO: "Vencido",
  VENCE_HOJE: "Vence hoje",
  A_VENCER: "A vencer",
  RECEBIDO: "Recebido",
};

export const situacaoClasses: Record<SituacaoLancamento, string> = {
  VENCIDO: "bg-[#fff5f5] text-[#e5484d]",
  VENCE_HOJE: "bg-[#fff7ed] text-[#f76b15]",
  A_VENCER: "bg-muted text-muted-foreground",
  RECEBIDO: "bg-[#ecfdf5] text-[#218358]",
};

export const contasAReceber: LancamentoRecebimento[] = [
  {
    id: "1",
    vencimento: "2026-08-05",
    recebidoDe: "João Francisco da Silva",
    descricao: "Parcela 7/10 - Contrato 2026-0001",
    categoria: "Receita com vendas",
    valorPrevisto: 1245000,
    situacao: "VENCIDO",
  },
  {
    id: "2",
    vencimento: "2026-08-10",
    recebidoDe: "Maria de Lurdes Ferreira",
    descricao: "Parcela 5/10 - Contrato 2026-0002",
    categoria: "Receita com vendas",
    valorPrevisto: 981240,
    situacao: "VENCIDO",
  },
  {
    id: "3",
    vencimento: "2026-08-15",
    recebidoDe: "Agropecuária Bom Retiro",
    descricao: "Arrendamento terras - Ago/26",
    categoria: "Arrendamento",
    valorPrevisto: 223760,
    situacao: "VENCIDO",
  },
  {
    id: "4",
    vencimento: "2026-08-17",
    recebidoDe: "Fazenda Santa Rita Ltda",
    descricao: "Venda de gado - Lote 52",
    categoria: "Receita com vendas",
    valorPrevisto: 820000,
    situacao: "VENCE_HOJE",
  },
  {
    id: "5",
    vencimento: "2026-08-20",
    recebidoDe: "Carlos Alberto Mendes",
    descricao: "Parcela 3/6 - Contrato 2026-0010",
    categoria: "Receita com vendas",
    valorPrevisto: 1890000,
    situacao: "A_VENCER",
  },
  {
    id: "6",
    vencimento: "2026-08-25",
    recebidoDe: "Cooperativa Agrícola Central",
    descricao: "Venda de café - Lote 8",
    categoria: "Receita com vendas",
    valorPrevisto: 4532000,
    situacao: "A_VENCER",
  },
  {
    id: "7",
    vencimento: "2026-08-28",
    recebidoDe: "Laticínio Serra Verde",
    descricao: "Venda de leite - Ago/26",
    categoria: "Receita com vendas",
    valorPrevisto: 1568000,
    situacao: "A_VENCER",
  },
  {
    id: "8",
    vencimento: "2026-08-01",
    recebidoDe: "João Francisco da Silva",
    descricao: "Parcela 6/10 - Contrato 2026-0001",
    categoria: "Receita com vendas",
    valorPrevisto: 1245000,
    valorRecebido: 1245000,
    situacao: "RECEBIDO",
  },
];
