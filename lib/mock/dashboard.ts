export const organizacao = {
  nome: "Target",
  documento: "12.345.678/0001-90",
}

export const usuario = {
  nome: "Rafael Arantes",
  email: "rafael@email.com",
}

export const contaBancaria = {
  nome: "Asaas",
  agencia: "1234",
  conta: "56789",
  saldoInicial: 7052950,
}

export const saldoTotal = contaBancaria.saldoInicial

const fluxoCaixaPontosChave = [
  { dia: 1, saldo: 200000, entradas: 300000, saidas: 100000 },
  { dia: 3, saldo: 800000, entradas: 1200000, saidas: 400000 },
  { dia: 5, saldo: 1500000, entradas: 2200000, saidas: 700000 },
  { dia: 7, saldo: 2800000, entradas: 3600000, saidas: 900000 },
  { dia: 9, saldo: 3900000, entradas: 4800000, saidas: 1100000 },
  { dia: 11, saldo: 4300000, entradas: 5400000, saidas: 1200000 },
  { dia: 13, saldo: 5300000, entradas: 6400000, saidas: 1300000 },
  { dia: 15, saldo: 5100000, entradas: 6900000, saidas: 1500000 },
  { dia: 17, saldo: 6100000, entradas: 7500000, saidas: 1600000 },
  { dia: 19, saldo: 6300000, entradas: 8000000, saidas: 1750000 },
  { dia: 21, saldo: 6700000, entradas: 8500000, saidas: 1850000 },
  { dia: 23, saldo: 6500000, entradas: 8800000, saidas: 1950000 },
  { dia: 25, saldo: 7052950, entradas: 9109240, saidas: 2056290 },
]

function serieDiaria(pontosChave: typeof fluxoCaixaPontosChave) {
  const pontos: { data: Date; saldo: number; entradas: number; saidas: number }[] = []

  for (let i = 0; i < pontosChave.length - 1; i++) {
    const atual = pontosChave[i]
    const proximo = pontosChave[i + 1]
    const passos = proximo.dia - atual.dia

    for (let passo = 0; passo < passos; passo++) {
      const t = passo / passos
      pontos.push({
        data: new Date(2026, 7, atual.dia + passo),
        saldo: Math.round(atual.saldo + (proximo.saldo - atual.saldo) * t),
        entradas: Math.round(
          atual.entradas + (proximo.entradas - atual.entradas) * t
        ),
        saidas: Math.round(atual.saidas + (proximo.saidas - atual.saidas) * t),
      })
    }
  }

  const ultimo = pontosChave[pontosChave.length - 1]
  pontos.push({
    data: new Date(2026, 7, ultimo.dia),
    saldo: ultimo.saldo,
    entradas: ultimo.entradas,
    saidas: ultimo.saidas,
  })

  return pontos
}

export const fluxoCaixa = {
  mesReferencia: new Date(2026, 7, 1),
  saldo: 7052950,
  entradas: 9109240,
  saidas: 2056290,
  serie: serieDiaria(fluxoCaixaPontosChave),
}

export type LancamentoBucket = "vencido" | "venceHoje" | "aVencer"

export interface Lancamento {
  contato: string
  descricao: string
  vencimento: Date
  valor: number
}

export interface ResumoLancamentos {
  total: number
  buckets: Record<LancamentoBucket, { count: number; total: number; itens: Lancamento[] }>
}

export const contasAReceber: ResumoLancamentos = {
  total: 17321000,
  buckets: {
    vencido: {
      count: 20,
      total: 9156000,
      itens: [
        {
          contato: "Mercado Silva Ltda",
          descricao: "Venda de produtos - NF 1234",
          vencimento: new Date(2026, 7, 5),
          valor: 1200000,
        },
        {
          contato: "João Pedro Almeida",
          descricao: "Serviço de consultoria",
          vencimento: new Date(2026, 7, 6),
          valor: 800000,
        },
        {
          contato: "Distribuidora Nova Era",
          descricao: "Venda de produtos - NF 1240",
          vencimento: new Date(2026, 7, 7),
          valor: 450000,
        },
        {
          contato: "Comércio Bela Vista",
          descricao: "Venda de serviço - contrato mensal",
          vencimento: new Date(2026, 7, 8),
          valor: 350000,
        },
        {
          contato: "Indústria Central",
          descricao: "Venda de produtos - NF 1250",
          vencimento: new Date(2026, 7, 9),
          valor: 275000,
        },
        {
          contato: "Grupo Horizonte",
          descricao: "Venda de produtos - NF 1255",
          vencimento: new Date(2026, 7, 10),
          valor: 610000,
        },
        {
          contato: "Papelaria Central",
          descricao: "Venda de material - NF 1260",
          vencimento: new Date(2026, 7, 11),
          valor: 98000,
        },
        {
          contato: "Transportadora Rápida",
          descricao: "Serviço de frete",
          vencimento: new Date(2026, 7, 12),
          valor: 415000,
        },
        {
          contato: "Consultoria Jurídica Souza",
          descricao: "Honorários - contrato",
          vencimento: new Date(2026, 7, 13),
          valor: 720000,
        },
        {
          contato: "Fornecedor Alfa Ltda",
          descricao: "Venda de insumos - NF 1270",
          vencimento: new Date(2026, 7, 14),
          valor: 530000,
        },
        {
          contato: "Escritório Contábil Prime",
          descricao: "Serviço de contabilidade",
          vencimento: new Date(2026, 7, 15),
          valor: 190000,
        },
        {
          contato: "Energia Distribuidora SA",
          descricao: "Venda de créditos",
          vencimento: new Date(2026, 7, 16),
          valor: 340000,
        },
        {
          contato: "Telecom Brasil",
          descricao: "Serviço de internet corporativa",
          vencimento: new Date(2026, 7, 17),
          valor: 265000,
        },
        {
          contato: "Gráfica Rápida",
          descricao: "Venda de material impresso",
          vencimento: new Date(2026, 7, 18),
          valor: 128000,
        },
        {
          contato: "Rafael Comércio ME",
          descricao: "Serviço prestado - agosto",
          vencimento: new Date(2026, 7, 19),
          valor: 480000,
        },
        {
          contato: "Construtora Vale Verde",
          descricao: "Venda de materiais - NF 1280",
          vencimento: new Date(2026, 7, 20),
          valor: 990000,
        },
        {
          contato: "Farmácia Bem Estar",
          descricao: "Venda de produtos - NF 1285",
          vencimento: new Date(2026, 7, 21),
          valor: 215000,
        },
        {
          contato: "Auto Peças União",
          descricao: "Venda de peças - NF 1290",
          vencimento: new Date(2026, 7, 22),
          valor: 305000,
        },
        {
          contato: "Restaurante Sabor Real",
          descricao: "Venda de serviço - evento",
          vencimento: new Date(2026, 7, 23),
          valor: 175000,
        },
        {
          contato: "Hotel Vista Mar",
          descricao: "Venda de serviço - hospedagem",
          vencimento: new Date(2026, 7, 24),
          valor: 620000,
        },
      ],
    },
    venceHoje: {
      count: 1,
      total: 820000,
      itens: [
        {
          contato: "Comércio Bela Vista",
          descricao: "Venda de serviço - contrato mensal",
          vencimento: new Date(2026, 7, 30),
          valor: 820000,
        },
      ],
    },
    aVencer: {
      count: 3,
      total: 7345000,
      itens: [
        {
          contato: "Indústria Central",
          descricao: "Venda de produtos - NF 1300",
          vencimento: new Date(2026, 8, 5),
          valor: 3000000,
        },
        {
          contato: "Rafael Comércio ME",
          descricao: "Serviço prestado - setembro",
          vencimento: new Date(2026, 8, 10),
          valor: 2200000,
        },
        {
          contato: "Grupo Horizonte",
          descricao: "Venda de produtos - NF 1310",
          vencimento: new Date(2026, 8, 15),
          valor: 2145000,
        },
      ],
    },
  },
}

export const contasAPagar: ResumoLancamentos = {
  total: 4037000,
  buckets: {
    vencido: {
      count: 2,
      total: 1287000,
      itens: [
        {
          contato: "Fornecedor Alfa Ltda",
          descricao: "Compra de matéria-prima",
          vencimento: new Date(2026, 7, 18),
          valor: 787000,
        },
        {
          contato: "Transportadora Rápida",
          descricao: "Frete - NF 998",
          vencimento: new Date(2026, 7, 22),
          valor: 500000,
        },
      ],
    },
    venceHoje: {
      count: 5,
      total: 348000,
      itens: [
        {
          contato: "Escritório Contábil Prime",
          descricao: "Honorários contábeis",
          vencimento: new Date(2026, 7, 30),
          valor: 120000,
        },
        {
          contato: "Energia Distribuidora SA",
          descricao: "Conta de energia",
          vencimento: new Date(2026, 7, 30),
          valor: 45000,
        },
        {
          contato: "Telecom Brasil",
          descricao: "Internet e telefonia",
          vencimento: new Date(2026, 7, 30),
          valor: 38000,
        },
        {
          contato: "Papelaria Central",
          descricao: "Material de escritório",
          vencimento: new Date(2026, 7, 30),
          valor: 25000,
        },
        {
          contato: "Serviços de Limpeza JR",
          descricao: "Limpeza mensal",
          vencimento: new Date(2026, 7, 30),
          valor: 120000,
        },
      ],
    },
    aVencer: {
      count: 3,
      total: 2402000,
      itens: [
        {
          contato: "Fornecedor Beta Componentes",
          descricao: "Compra de produto - NF 545",
          vencimento: new Date(2026, 8, 8),
          valor: 1200000,
        },
        {
          contato: "Consultoria Jurídica Souza",
          descricao: "Honorários - contrato",
          vencimento: new Date(2026, 8, 12),
          valor: 802000,
        },
        {
          contato: "Gráfica Rápida",
          descricao: "Material promocional",
          vencimento: new Date(2026, 8, 18),
          valor: 400000,
        },
      ],
    },
  },
}

export const recebimentosPorMes = [
  { mes: new Date(2025, 8, 1), valor: 4200000 },
  { mes: new Date(2025, 9, 1), valor: 6700000 },
  { mes: new Date(2025, 10, 1), valor: 5400000 },
  { mes: new Date(2025, 11, 1), valor: 2800000 },
  { mes: new Date(2026, 0, 1), valor: 6100000 },
  { mes: new Date(2026, 1, 1), valor: 7800000 },
  { mes: new Date(2026, 2, 1), valor: 5900000 },
  { mes: new Date(2026, 3, 1), valor: 4500000 },
  { mes: new Date(2026, 4, 1), valor: 8300000 },
  { mes: new Date(2026, 5, 1), valor: 7200000 },
  { mes: new Date(2026, 6, 1), valor: 5000000 },
  { mes: new Date(2026, 7, 1), valor: 9100000 },
]

export const totalRecebidoNoPeriodo = recebimentosPorMes.reduce(
  (acc, item) => acc + item.valor,
  0
)
