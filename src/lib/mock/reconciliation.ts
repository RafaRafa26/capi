export type TipoTransacao = "entrada" | "saida"
export type TipoCategorizacao = "pagamento" | "transferencia"

export interface LancamentoCapiSugerido {
  descricao: string
  origem: string
  data: Date
  categoria: string
  valor: number
}

export interface TransacaoBancaria {
  id: string
  descricao: string
  data: Date
  tipo: TipoTransacao
  valor: number
  match?: LancamentoCapiSugerido
  categorizacaoSugerida?: TipoCategorizacao
}

export const contatosDisponiveis = [
  "João Francisco da Silva",
  "Maria de Lurdes Ferreira",
  "Fazenda Boa Esperança",
  "Agropecuária Bom Retiro",
]

export const categoriasDespesa = [
  "Taxas bancárias",
  "Despesas operacionais",
  "Repasses",
  "Impostos e taxas",
]

export const contasDestinoDisponiveis = ["ASAAS - Ag 1234 / CC 56789"]
