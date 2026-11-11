// Regras puras do extrato do favorecido — usadas pelo serviço, pelo Sheet e
// pelo PDF, sem tocar no banco.
import type { BeneficiaryStatementLine } from "./types"

type BillingType = "INSTALLMENTS" | "RECURRING"

/** Como o recebimento aparece para o usuário: parcela de quantas, avulso ou cobrança recorrente. */
export function installmentLabel(
  billingType: BillingType,
  installmentNumber: number | null,
  installmentsCount: number,
): string {
  if (billingType === "RECURRING") return installmentNumber ? `Recorrente nº ${installmentNumber}` : "Recorrente"
  if (installmentsCount <= 1 || !installmentNumber) return "Avulso"
  return `Parcela ${installmentNumber}/${installmentsCount}`
}

/**
 * Preenche o saldo acumulado de cada linha percorrendo em ordem cronológica
 * (no mesmo dia, crédito antes do débito). A lista volta nessa mesma ordem,
 * mais antiga primeiro, que é como a tela e o PDF mostram.
 */
export function withRunningBalance(lines: BeneficiaryStatementLine[]): BeneficiaryStatementLine[] {
  const chronological = [...lines].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || (a.kind === b.kind ? 0 : a.kind === "CREDIT" ? -1 : 1),
  )
  let balance = 0
  return chronological.map((line) => {
    balance += line.amount
    return { ...line, balance }
  })
}

export interface StatementPeriod {
  from: Date | null
  to: Date | null
}

export interface StatementSlice {
  /** Saldo antes da primeira linha do período. */
  openingBalance: number
  /** Saldo depois da última linha do período. */
  closingBalance: number
  credits: number
  /** Positivo: o total repassado no período. */
  debits: number
  /** Mais antiga primeiro. */
  lines: BeneficiaryStatementLine[]
}

/** O recorte do extrato por período, com saldo anterior e final — `lines` deve vir de withRunningBalance. */
export function sliceStatement(lines: BeneficiaryStatementLine[], period: StatementPeriod): StatementSlice {
  const inPeriod = (line: BeneficiaryStatementLine) =>
    (!period.from || line.date >= period.from) && (!period.to || line.date <= period.to)

  const selected = lines.filter(inPeriod)
  // `lines` vem em ordem cronológica: o saldo anterior é o da última linha antes do período.
  const before = period.from ? lines.filter((line) => line.date < period.from!).at(-1) : undefined
  const openingBalance = before?.balance ?? 0
  const closingBalance = selected.at(-1)?.balance ?? openingBalance

  return {
    openingBalance,
    closingBalance,
    credits: selected.filter((line) => line.kind === "CREDIT").reduce((sum, line) => sum + line.amount, 0),
    debits: selected.filter((line) => line.kind === "DEBIT").reduce((sum, line) => sum - line.amount, 0),
    lines: selected,
  }
}
