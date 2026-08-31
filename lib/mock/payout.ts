export interface ItemDisponivel {
  cliente: string
  contrato: string
  vencimento: Date
  valor: number
}

export interface DadosBancarios {
  chavePix: string
  banco: string
  agencia: string
  conta: string
  tipoConta: string
  titular: string
}

export interface Beneficiario {
  id: string
  nome: string
  documento: string
  disponivel: number
  pendente: number
  realizado: number
  itensDisponiveis: ItemDisponivel[]
  dadosBancarios: DadosBancarios
}

export const resumoRepasses = {
  disponivel: 6988290,
  pendente: 1402000,
  realizado: 4185236,
}

export const beneficiarios: Beneficiario[] = [
  {
    id: "1",
    nome: "Fazenda Santa Rita",
    documento: "12.345.678/0001-90",
    disponivel: 3573000,
    pendente: 657000,
    realizado: 8840000,
    itensDisponiveis: [
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000041", vencimento: new Date(2026, 7, 5), valor: 500000 },
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000041", vencimento: new Date(2026, 7, 10), valor: 500000 },
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000041", vencimento: new Date(2026, 7, 15), valor: 500000 },
      { cliente: "Maria Fernandes", contrato: "2026-000048", vencimento: new Date(2026, 7, 8), valor: 350000 },
      { cliente: "Comércio Bela Vista", contrato: "2026-000052", vencimento: new Date(2026, 7, 1), valor: 823000 },
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000041", vencimento: new Date(2026, 7, 20), valor: 500000 },
      { cliente: "Indústria Central", contrato: "2026-000055", vencimento: new Date(2026, 7, 1), valor: 400000 },
    ],
    dadosBancarios: {
      chavePix: "12.345.678/0001-90",
      banco: "001 - Banco do Brasil",
      agencia: "1234",
      conta: "56789-0",
      tipoConta: "Conta Corrente",
      titular: "Fazenda Santa Rita Ltda",
    },
  },
  {
    id: "2",
    nome: "Fazenda Boa Esperança",
    documento: "98.765.432/0001-10",
    disponivel: 1891240,
    pendente: 0,
    realizado: 2415000,
    itensDisponiveis: [
      { cliente: "Maria Fernandes", contrato: "2026-000039", vencimento: new Date(2026, 7, 3), valor: 450000 },
      { cliente: "Comércio Bela Vista", contrato: "2026-000044", vencimento: new Date(2026, 7, 9), valor: 620000 },
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000047", vencimento: new Date(2026, 7, 14), valor: 210000 },
      { cliente: "Maria Fernandes", contrato: "2026-000039", vencimento: new Date(2026, 7, 22), valor: 450000 },
      { cliente: "Indústria Central", contrato: "2026-000050", vencimento: new Date(2026, 7, 1), valor: 161240 },
    ],
    dadosBancarios: {
      chavePix: "98.765.432/0001-10",
      banco: "341 - Itaú Unibanco",
      agencia: "5678",
      conta: "12345-6",
      tipoConta: "Conta Corrente",
      titular: "Fazenda Boa Esperança Ltda",
    },
  },
  {
    id: "3",
    nome: "João B. Nogueira",
    documento: "123.456.789-00",
    disponivel: 1200000,
    pendente: 0,
    realizado: 4000000,
    itensDisponiveis: [
      { cliente: "Comércio Bela Vista", contrato: "2026-000036", vencimento: new Date(2026, 7, 6), valor: 400000 },
      { cliente: "Indústria Central", contrato: "2026-000043", vencimento: new Date(2026, 7, 12), valor: 300000 },
      { cliente: "Paulo Roberto da Silva", contrato: "2026-000046", vencimento: new Date(2026, 7, 18), valor: 500000 },
    ],
    dadosBancarios: {
      chavePix: "123.456.789-00",
      banco: "104 - Caixa Econômica Federal",
      agencia: "0021",
      conta: "98765-4",
      tipoConta: "Conta Corrente",
      titular: "João B. Nogueira",
    },
  },
  {
    id: "4",
    nome: "Fazenda São Judas",
    documento: "45.678.912/0001-33",
    disponivel: 0,
    pendente: 745000,
    realizado: 1530000,
    itensDisponiveis: [],
    dadosBancarios: {
      chavePix: "45.678.912/0001-33",
      banco: "237 - Bradesco",
      agencia: "3344",
      conta: "11223-4",
      tipoConta: "Conta Corrente",
      titular: "Fazenda São Judas Ltda",
    },
  },
  {
    id: "5",
    nome: "Marcos Vieira",
    documento: "987.654.321-00",
    disponivel: 324050,
    pendente: 0,
    realizado: 1400000,
    itensDisponiveis: [
      { cliente: "Maria Fernandes", contrato: "2026-000037", vencimento: new Date(2026, 7, 11), valor: 124050 },
      { cliente: "Comércio Bela Vista", contrato: "2026-000042", vencimento: new Date(2026, 7, 19), valor: 200000 },
    ],
    dadosBancarios: {
      chavePix: "987.654.321-00",
      banco: "260 - Nu Pagamentos",
      agencia: "0001",
      conta: "55667-8",
      tipoConta: "Conta Corrente",
      titular: "Marcos Vieira",
    },
  },
]
