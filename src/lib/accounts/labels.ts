// PT labels shared between the accounts table and its detail Sheet — kept
// here (not in accounts-view.tsx) so the Sheet can import them without a
// circular dependency, since accounts-view.tsx renders the Sheet.
import type { AccountStatus } from "@/lib/accounts/filter"
import type {
  AllocationMode,
  ContractBillingFrequency,
  ContractModality,
  LedgerKind,
  PaymentMethodCode,
} from "@/modules/accounts/types"

export const paymentMethodLabel: Record<PaymentMethodCode, string> = {
  BOLETO: "Boleto",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência",
}

export const billingFrequencyLabel: Record<ContractBillingFrequency, string> = {
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
}

export const contractModalityLabel: Record<ContractModality, string> = {
  INSTALLMENTS: "Parcelada",
  RECURRING: "Recorrente",
}

export const allocationModeLabel: Record<AllocationMode, string> = {
  PERCENTAGE: "Percentual",
  FIXED_AMOUNT: "Valor fixo",
}

export const kindConfig: Record<
  LedgerKind,
  {
    paymentColumnLabel: string
    amountColumnLabel: string
    paidLabel: string
    summaryPaidLabel: string
    emptyPaymentDate: string
    contactLabel: string
    contractOriginLabel: string
    remainingLabel: string
    settlementAccountLabel: string
    settlementSectionTitle: string
    settlementDateLabel: string
    settledAmountLabel: string
    settleFormTitle: string
    settleActionLabel: string
    settlementsTabLabel: string
    emptySettlementsLabel: string
  }
> = {
  pay: {
    paymentColumnLabel: "Pagamento",
    amountColumnLabel: "A pagar",
    paidLabel: "Pago",
    summaryPaidLabel: "Pagos",
    emptyPaymentDate: "—",
    contactLabel: "Fornecedor",
    contractOriginLabel: "Dados da compra",
    remainingLabel: "Valor a pagar",
    settlementAccountLabel: "Conta de pagamento",
    settlementSectionTitle: "Pagamento",
    settlementDateLabel: "Data de pagamento",
    settledAmountLabel: "Valor pago",
    settleFormTitle: "Registrar pagamento",
    settleActionLabel: "Pagar",
    settlementsTabLabel: "Pagamentos",
    emptySettlementsLabel: "Nenhum pagamento registrado ainda.",
  },
  rec: {
    paymentColumnLabel: "Recebimento",
    amountColumnLabel: "A receber",
    paidLabel: "Recebido",
    summaryPaidLabel: "Recebidos",
    emptyPaymentDate: "—",
    contactLabel: "Cliente",
    contractOriginLabel: "Dados da venda",
    remainingLabel: "Valor a receber",
    settlementAccountLabel: "Conta de recebimento",
    settlementSectionTitle: "Recebimento",
    settlementDateLabel: "Data de recebimento",
    settledAmountLabel: "Valor recebido",
    settleFormTitle: "Registrar recebimento",
    settleActionLabel: "Receber",
    settlementsTabLabel: "Recebimentos",
    emptySettlementsLabel: "Nenhum recebimento registrado ainda.",
  },
}

export function statusLabel(status: AccountStatus, kind: LedgerKind): string {
  switch (status) {
    case "OVERDUE":
      return "Vencido"
    case "DUE_TODAY":
      return "Vence hoje"
    case "UPCOMING":
      return "A vencer"
    case "PAID":
      return kindConfig[kind].paidLabel
  }
}

export const statusBadgeStyle: Record<AccountStatus, { backgroundColor?: string; color?: string }> = {
  OVERDUE: { backgroundColor: "oklch(0.63 0.24 25 / 14%)", color: "oklch(0.55 0.22 25)" },
  DUE_TODAY: { backgroundColor: "oklch(0.77 0.16 70 / 20%)", color: "oklch(0.5 0.12 60)" },
  UPCOMING: {},
  PAID: { backgroundColor: "oklch(0.72 0.19 149 / 15%)", color: "oklch(0.5 0.15 149)" },
}
