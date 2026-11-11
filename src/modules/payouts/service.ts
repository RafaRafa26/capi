import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import type { BankDetails } from "@/modules/contacts/types"
import { computeBeneficiaryShare, netSettledAmount } from "@/modules/settlements/domain"
import { BusinessError, NotFound } from "@/shared/errors"
import { installmentLabel, withRunningBalance } from "./statement"
import type { GeneratePayoutInput } from "./schema"
import type {
  BeneficiaryCredit,
  BeneficiaryPosition,
  BeneficiaryStatement,
  BeneficiaryStatementLine,
  PayoutSummary,
} from "./types"

function creditKey(settlementId: string, allocationId: string): string {
  return `${settlementId}:${allocationId}`
}

/**
 * Os créditos de custódia, um por Settlement × Allocation: só liquidação de
 * extrato credita favorecido (RN-01/RN-01a), e a cota de cada um sai de
 * computeBeneficiaryShare — que já resolve percentual, valor fixo e
 * recebimento parcial de uma vez só. Sem `beneficiaryId` carrega todo mundo
 * numa query só, que é o que a tela de repasses precisa.
 */
async function loadCredits(tx: Tx, beneficiaryId?: string): Promise<Map<string, BeneficiaryCredit[]>> {
  const allocations = await tx.allocation.findMany({
    where: beneficiaryId ? { beneficiaryId } : {},
    include: {
      sale: {
        include: {
          contact: { select: { name: true } },
          entries: {
            include: { settlements: { where: { origin: "STATEMENT" }, orderBy: { settledAt: "asc" } } },
          },
        },
      },
    },
  })

  const byBeneficiary = new Map<string, BeneficiaryCredit[]>()
  for (const allocation of allocations) {
    for (const entry of allocation.sale.entries) {
      for (const settlement of entry.settlements) {
        // Juros e multa compõem o crédito, desconto reduz (RN-02/RN-03).
        const amount = computeBeneficiaryShare(netSettledAmount(settlement), allocation.sale.totalAmount, allocation.amount)
        if (amount === 0) continue

        const list = byBeneficiary.get(allocation.beneficiaryId) ?? []
        list.push({
          id: creditKey(settlement.id, allocation.id),
          settlementId: settlement.id,
          allocationId: allocation.id,
          entryId: entry.id,
          payerName: allocation.sale.contact.name,
          description: entry.description,
          installmentLabel: installmentLabel(
            allocation.sale.billingType,
            entry.installmentNumber,
            allocation.sale.installmentsCount,
          ),
          dueDate: fromDbDate(entry.dueDate),
          settledAt: fromDbDate(settlement.settledAt),
          amount,
        })
        byBeneficiary.set(allocation.beneficiaryId, list)
      }
    }
  }
  return byBeneficiary
}

interface PayoutTotals {
  /** Gerado e ainda não conciliado — reserva saldo (RN-09). */
  pending: number
  /** Já conciliado com a saída bancária. */
  realized: number
  /** pending + realized: tudo que sai do disponível. */
  total: number
}

async function loadPayoutTotals(tx: Tx, beneficiaryId?: string): Promise<Map<string, PayoutTotals>> {
  const payouts = await tx.payout.findMany({
    where: beneficiaryId ? { beneficiaryId } : {},
    include: { entry: { select: { settledAmount: true } } },
  })

  const byBeneficiary = new Map<string, PayoutTotals>()
  for (const payout of payouts) {
    const realized = Math.min(payout.entry.settledAmount ?? 0, payout.amount)
    const totals = byBeneficiary.get(payout.beneficiaryId) ?? { pending: 0, realized: 0, total: 0 }
    totals.realized += realized
    totals.pending += payout.amount - realized
    totals.total += payout.amount
    byBeneficiary.set(payout.beneficiaryId, totals)
  }
  return byBeneficiary
}

function sumCredits(credits: BeneficiaryCredit[] | undefined): number {
  return (credits ?? []).reduce((sum, credit) => sum + credit.amount, 0)
}

/** A tela de repasses inteira: posição de cada favorecido + os totais do topo. */
export async function getPayoutSummary(organizationId: string): Promise<PayoutSummary> {
  return withOrganization(organizationId, async (tx) => {
    const [beneficiaries, credits, payouts] = await Promise.all([
      tx.contact.findMany({ where: { contactType: "BENEFICIARY" }, orderBy: { name: "asc" } }),
      loadCredits(tx),
      loadPayoutTotals(tx),
    ])

    const rows: BeneficiaryPosition[] = beneficiaries.map((beneficiary) => {
      const totals = payouts.get(beneficiary.id) ?? { pending: 0, realized: 0, total: 0 }
      return {
        beneficiaryId: beneficiary.id,
        name: beneficiary.name,
        document: beneficiary.document,
        bankDetails: (beneficiary.bankDetails as BankDetails | null) ?? null,
        available: sumCredits(credits.get(beneficiary.id)) - totals.total,
        pending: totals.pending,
        realized: totals.realized,
      }
    })

    return {
      beneficiaries: rows,
      totals: {
        available: rows.reduce((sum, row) => sum + row.available, 0),
        pending: rows.reduce((sum, row) => sum + row.pending, 0),
        realized: rows.reduce((sum, row) => sum + row.realized, 0),
      },
    }
  })
}

/**
 * Os recebimentos que ainda compõem o saldo *disponível*, com o que resta de
 * cada um. Repasse gerado escolhendo recebimentos abate exatamente deles
 * (PayoutItem). O que de um repasse não está ligado a recebimento nenhum —
 * repasses de antes da escolha existir, ou cujo recebimento foi desconciliado
 * depois — é abatido em ordem cronológica: os mais antigos são os que já
 * saíram. Um crédito coberto pela metade volta com o valor restante, de modo
 * que a soma da lista bate exatamente com o disponível (RN-09).
 */
async function loadRemainingCredits(tx: Tx, beneficiaryId: string): Promise<BeneficiaryCredit[]> {
  const [creditsByBeneficiary, payouts, items] = await Promise.all([
    loadCredits(tx, beneficiaryId),
    loadPayoutTotals(tx, beneficiaryId),
    tx.payoutItem.findMany({ where: { payout: { beneficiaryId } } }),
  ])

  const linked = new Map<string, number>()
  for (const item of items) {
    const key = creditKey(item.settlementId, item.allocationId)
    linked.set(key, (linked.get(key) ?? 0) + item.amount)
  }

  // Se a liquidação mudou e ficou menor que o já ligado, o excesso volta para
  // o bolo sem vínculo em vez de deixar o crédito negativo.
  let unlinked = payouts.get(beneficiaryId)?.total ?? 0
  const credits = (creditsByBeneficiary.get(beneficiaryId) ?? [])
    .map((credit) => {
      const covered = Math.min(linked.get(credit.id) ?? 0, credit.amount)
      unlinked -= covered
      return { ...credit, amount: credit.amount - covered }
    })
    .sort((a, b) => a.settledAt.getTime() - b.settledAt.getTime())

  const remaining: BeneficiaryCredit[] = []
  for (const credit of credits) {
    const consumed = Math.min(Math.max(unlinked, 0), credit.amount)
    unlinked -= consumed
    if (credit.amount - consumed > 0) remaining.push({ ...credit, amount: credit.amount - consumed })
  }
  return remaining
}

/** A lista do diálogo "Gerar repasse" — ver loadRemainingCredits. */
export async function listAvailableCredits(organizationId: string, beneficiaryId: string): Promise<BeneficiaryCredit[]> {
  return withOrganization(organizationId, (tx) => loadRemainingCredits(tx, beneficiaryId))
}

/**
 * Os recebimentos que compõem um repasse, cada um com a parte dele que entrou
 * nesse repasse. Repasse com recebimentos escolhidos responde direto pelos
 * PayoutItem. O que de um repasse não tem vínculo (repasses antigos, ou
 * recebimento desconciliado depois) é atribuído como loadRemainingCredits
 * consome: repasses em ordem de criação, cada um levando os recebimentos mais
 * antigos que sobraram depois dos vínculos explícitos.
 */
export async function listPayoutCredits(organizationId: string, entryId: string): Promise<BeneficiaryCredit[]> {
  return withOrganization(organizationId, async (tx) => {
    const target = await tx.payout.findUnique({ where: { entryId } })
    if (!target) throw new NotFound("Repasse")

    const [creditsByBeneficiary, payouts] = await Promise.all([
      loadCredits(tx, target.beneficiaryId),
      tx.payout.findMany({
        where: { beneficiaryId: target.beneficiaryId },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
    ])
    const credits = (creditsByBeneficiary.get(target.beneficiaryId) ?? []).sort(
      (a, b) => a.settledAt.getTime() - b.settledAt.getTime(),
    )
    const byKey = new Map(credits.map((credit) => [credit.id, credit]))

    // O que sobra de cada recebimento depois de todos os vínculos explícitos.
    const free = new Map(credits.map((credit) => [credit.id, credit.amount]))
    const portions = new Map<string, number>()
    for (const payout of payouts) {
      for (const item of payout.items) {
        const key = creditKey(item.settlementId, item.allocationId)
        if (!byKey.has(key)) continue
        free.set(key, (free.get(key) ?? 0) - item.amount)
        if (payout.id === target.id) portions.set(key, (portions.get(key) ?? 0) + item.amount)
      }
    }

    for (const payout of payouts) {
      let unlinked = payout.amount - payout.items.reduce((sum, item) => sum + item.amount, 0)
      for (const credit of credits) {
        if (unlinked <= 0) break
        const available = Math.max(free.get(credit.id) ?? 0, 0)
        if (available === 0) continue
        const taken = Math.min(available, unlinked)
        free.set(credit.id, available - taken)
        unlinked -= taken
        if (payout.id === target.id) portions.set(credit.id, (portions.get(credit.id) ?? 0) + taken)
      }
      if (payout.id === target.id) break
    }

    return credits
      .filter((credit) => (portions.get(credit.id) ?? 0) > 0)
      .map((credit) => ({ ...credit, amount: portions.get(credit.id)! }))
  })
}

/** Extrato do favorecido: recebimentos que creditaram (+) e repasses gerados (−), mais antigo primeiro. */
export async function getBeneficiaryStatement(organizationId: string, beneficiaryId: string): Promise<BeneficiaryStatement> {
  return withOrganization(organizationId, async (tx) => {
    const beneficiary = await tx.contact.findUnique({ where: { id: beneficiaryId } })
    if (!beneficiary) throw new NotFound("Favorecido")

    const [creditsByBeneficiary, payouts] = await Promise.all([
      loadCredits(tx, beneficiaryId),
      tx.payout.findMany({ where: { beneficiaryId }, include: { entry: true } }),
    ])

    const credits = creditsByBeneficiary.get(beneficiaryId) ?? []
    const creditLines: BeneficiaryStatementLine[] = credits.map((credit) => ({
      id: credit.id,
      kind: "CREDIT",
      date: credit.settledAt,
      amount: credit.amount,
      title: credit.payerName,
      description: credit.description,
      entryId: credit.entryId,
      status: null,
      dueDate: credit.dueDate,
      installmentLabel: credit.installmentLabel,
      balance: 0,
    }))

    let pending = 0
    let realized = 0
    let payoutTotal = 0
    const debitLines: BeneficiaryStatementLine[] = payouts.map((payout) => {
      const settled = Math.min(payout.entry.settledAmount ?? 0, payout.amount)
      realized += settled
      pending += payout.amount - settled
      payoutTotal += payout.amount
      return {
        id: payout.id,
        kind: "DEBIT",
        date: fromDbDate(payout.entry.dueDate),
        amount: -payout.amount,
        title: "Repasse",
        description: payout.entry.description,
        entryId: payout.entryId,
        status: settled >= payout.amount ? "REALIZED" : "PENDING",
        dueDate: fromDbDate(payout.entry.dueDate),
        installmentLabel: null,
        balance: 0,
      }
    })

    return {
      beneficiaryId,
      name: beneficiary.name,
      document: beneficiary.document,
      bankDetails: (beneficiary.bankDetails as BankDetails | null) ?? null,
      available: sumCredits(credits) - payoutTotal,
      pending,
      realized,
      lines: withRunningBalance([...creditLines, ...debitLines]),
    }
  })
}

const PAYOUT_CATEGORY_NAME = "Repasse"

/** A categoria de despesa dos repasses, criada uma única vez — ninguém escolhe isso a cada repasse. */
async function resolvePayoutCategory(tx: Tx, organizationId: string): Promise<string> {
  const existing = await tx.category.findFirst({
    where: { type: "EXPENSE", name: PAYOUT_CATEGORY_NAME, parentId: null },
  })
  if (existing) return existing.id

  const created = await tx.category.create({
    data: { organizationId, name: PAYOUT_CATEGORY_NAME, type: "EXPENSE" },
  })
  return created.id
}

/**
 * Gera o repasse dos recebimentos escolhidos: uma conta a pagar para o
 * favorecido, marcada como Payout pra sair do disponível. Nasce sem conta
 * bancária — de onde sai o dinheiro só se sabe na conciliação, que não filtra
 * lançamento por conta. Daí em diante é um PAYABLE comum: quem move de
 * "pendente" para "realizado" é a conciliação normal dessa entry com a saída.
 */
export async function generatePayout(organizationId: string, input: GeneratePayoutInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const beneficiary = await tx.contact.findUnique({ where: { id: input.beneficiaryId } })
    if (!beneficiary) throw new NotFound("Favorecido")
    if (beneficiary.contactType !== "BENEFICIARY") {
      throw new BusinessError("O contato selecionado não é um favorecido.", "beneficiaryId")
    }

    // RN-10: o valor é o restante de cada recebimento apurado aqui dentro, não
    // o que a tela mostrou — entre abrir o diálogo e confirmar, uma
    // conciliação ou outro repasse pode ter mudado o saldo.
    const remaining = new Map((await loadRemainingCredits(tx, input.beneficiaryId)).map((c) => [c.id, c]))
    const selected = [...new Set(input.credits.map((c) => creditKey(c.settlementId, c.allocationId)))].map((key) => {
      const credit = remaining.get(key)
      if (!credit) {
        throw new BusinessError("Um dos recebimentos selecionados não está mais disponível para repasse. Reabra o repasse.")
      }
      return credit
    })
    const amount = selected.reduce((sum, credit) => sum + credit.amount, 0)
    if (amount <= 0) {
      throw new BusinessError("Este favorecido não tem saldo disponível para repasse.")
    }

    const entry = await tx.entry.create({
      data: {
        organizationId,
        contactId: input.beneficiaryId,
        categoryId: await resolvePayoutCategory(tx, organizationId),
        type: "PAYABLE",
        description: `${PAYOUT_CATEGORY_NAME} - ${beneficiary.name}`,
        dueDate: input.dueDate,
        amount,
        // O favorecido é cadastrado com chave PIX (contacts/types.ts#BankDetails),
        // que é como o repasse é pago na prática.
        paymentMethod: "PIX",
      },
    })

    await tx.payout.create({
      data: {
        organizationId,
        beneficiaryId: input.beneficiaryId,
        entryId: entry.id,
        amount,
        items: {
          create: selected.map((credit) => ({
            organizationId,
            settlementId: credit.settlementId,
            allocationId: credit.allocationId,
            amount: credit.amount,
          })),
        },
      },
    })
  })
}
