import type { BankDetails } from "@/modules/contacts/types"

/** Um favorecido na tela de repasses, com as três posições da RN-09. */
export interface BeneficiaryPosition {
  beneficiaryId: string
  name: string
  document: string | null
  /** Para copiar na hora de pagar o repasse — só o favorecido tem, e é obrigatório no cadastro dele. */
  bankDetails: BankDetails | null
  /** Créditos conciliados − tudo que já virou repasse (pendente ou realizado). */
  available: number
  /** Repasses gerados e ainda não conciliados — saldo reservado. */
  pending: number
  /** Repasses já conciliados com uma saída bancária. */
  realized: number
}

export interface PayoutSummary {
  beneficiaries: BeneficiaryPosition[]
  totals: { available: number; pending: number; realized: number }
}

/**
 * Um recebimento conciliado que creditou o favorecido — a "origem" de uma
 * fatia do saldo dele. `amount` é a cota dele naquela liquidação, não o valor
 * cheio que entrou no banco.
 */
export interface BeneficiaryCredit {
  settlementId: string
  entryId: string
  /** Quem pagou — o cliente da venda que gerou esse recebimento. */
  payerName: string
  description: string
  dueDate: Date
  settledAt: Date
  amount: number
}

export type PayoutStatus = "PENDING" | "REALIZED"

/**
 * Uma linha do extrato do favorecido. Crédito (recebimento conciliado) vem
 * positivo, débito (repasse gerado) vem negativo — a UI monta uma lista só.
 */
export interface BeneficiaryStatementLine {
  id: string
  kind: "CREDIT" | "DEBIT"
  date: Date
  amount: number
  /** Quem pagou, no crédito; "Repasse", no débito. */
  title: string
  description: string
  /** O lançamento de origem: a conta a receber no crédito, o repasse no débito. */
  entryId: string
  /** Só preenchido no débito. */
  status: PayoutStatus | null
}

export interface BeneficiaryStatement extends BeneficiaryPosition {
  lines: BeneficiaryStatementLine[]
}
