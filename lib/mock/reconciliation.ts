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

export const contaConciliacao = "ASAAS - Ag 1234 / CC 56789"

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

export const transacoesBancarias: TransacaoBancaria[] = [
  {
    id: "1",
    descricao: "Cobrança recebida - fatura nr. xxxxxxxx JOÃO FRANCISCO DA SILVA",
    data: new Date(2026, 7, 5),
    tipo: "entrada",
    valor: 1245000,
    match: {
      descricao: "JOÃO FRANCISCO DA SILVA - Parcela 7/10 - Contrato 2026-000000",
      origem: "Fazenda Boa Esperança",
      data: new Date(2026, 7, 8),
      categoria: "Receitas com vendas",
      valor: 1245000,
    },
  },
  {
    id: "2",
    descricao: "Cobrança recebida - fatura nr. xxxxxxxx MARIA DE LURDES FERREIRA",
    data: new Date(2026, 7, 6),
    tipo: "entrada",
    valor: 981240,
    match: {
      descricao: "MARIA DE LURDES FERREIRA - Parcela 5/10 - Contrato 2026-000000",
      origem: "Agropecuária Bom Retiro",
      data: new Date(2026, 7, 10),
      categoria: "Receitas com vendas",
      valor: 981240,
    },
  },
  {
    id: "3",
    descricao: "Taxa de boleto - fatura nr. XXXXXXXX MARIA DE LURDES FERREIRA",
    data: new Date(2026, 7, 7),
    tipo: "saida",
    valor: 199,
    categorizacaoSugerida: "pagamento",
  },
  {
    id: "4",
    descricao: "Transação via Pix com chave para JOÃO FRANCISCO DA SILVA",
    data: new Date(2026, 7, 5),
    tipo: "saida",
    valor: 897000,
    match: {
      descricao: "REPASSE xxxx xxxx",
      origem: "Fazenda Santa Rita",
      data: new Date(2026, 7, 5),
      categoria: "Repasses",
      valor: 897000,
    },
  },
  {
    id: "5",
    descricao: "Transação via Pix com chave para AGROPECUARIA BOI SOBERANO",
    data: new Date(2026, 7, 7),
    tipo: "saida",
    valor: 199,
    categorizacaoSugerida: "transferencia",
  },
]
