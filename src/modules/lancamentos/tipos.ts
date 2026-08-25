// Rótulos e cores compartilhados entre servidor e cliente. Fora do servico.ts
// porque aquele arquivo importa o driver do banco.

export type SituacaoLancamento =
  | "VENCIDO"
  | "VENCE_HOJE"
  | "A_VENCER"
  | "LIQUIDADO";

export const situacaoLabel: Record<SituacaoLancamento, string> = {
  VENCIDO: "Vencido",
  VENCE_HOJE: "Vence hoje",
  A_VENCER: "A vencer",
  LIQUIDADO: "Liquidado",
};

export const situacaoClasses: Record<SituacaoLancamento, string> = {
  VENCIDO: "bg-[#fff5f5] text-[#e5484d]",
  VENCE_HOJE: "bg-[#fff7ed] text-[#f76b15]",
  A_VENCER: "bg-muted text-muted-foreground",
  LIQUIDADO: "bg-[#ecfdf5] text-[#218358]",
};

export type LancamentoDaLista = {
  id: string;
  vencimento: string;
  contato: string;
  descricao: string;
  categoria: string;
  valorPrevisto: number;
  valorLiquidado: number;
  status: string;
  situacao: SituacaoLancamento;
};
