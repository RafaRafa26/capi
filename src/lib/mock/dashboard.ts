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
