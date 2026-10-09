import "server-only"

import { fromDbDate, withOrganization, type Tx } from "@/db/client"
import { BusinessError, NotFound } from "@/shared/errors"
import { directionForTransactionAmount, netSettledAmount, recomputeEntryAggregate, suggestMatches } from "./domain"
import type {
  CreateAndSettlePayableInput,
  CreateAndSettleTransferInput,
  CreateSettlementBatchInput,
  CreateSettlementInput,
  ManualSettleInput,
  SearchCandidateEntriesInput,
} from "./schema"
import type { CandidateEntry, MatchedSettlement, SettlementReceipt, TransactionMatchInfo } from "./types"

async function loadEntry(tx: Tx, entryId: string) {
  const entry = await tx.entry.findUnique({ where: { id: entryId } })
  if (!entry) throw new NotFound("Lançamento")
  return entry
}

async function loadBankTransaction(tx: Tx, bankTransactionId: string) {
  const transaction = await tx.bankTransaction.findUnique({ where: { id: bankTransactionId } })
  if (!transaction) throw new NotFound("Transação bancária")
  return transaction
}

async function loadContact(tx: Tx, contactId: string) {
  const contact = await tx.contact.findUnique({ where: { id: contactId } })
  if (!contact) throw new NotFound("Contato")
  return contact
}

async function loadExpenseCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new NotFound("Categoria")
  if (category.type !== "EXPENSE") {
    throw new BusinessError("A categoria selecionada não é de despesa.", "categoryId")
  }
  return category
}

async function loadIncomeCategory(tx: Tx, categoryId: string) {
  const category = await tx.category.findUnique({ where: { id: categoryId } })
  if (!category) throw new NotFound("Categoria")
  if (category.type !== "INCOME") {
    throw new BusinessError("A categoria selecionada não é de receita.", "categoryId")
  }
  return category
}

async function loadBankAccount(tx: Tx, bankAccountId: string) {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId } })
  if (!bankAccount) throw new NotFound("Conta bancária")
  return bankAccount
}

/** Recomputes and persists an Entry's aggregate from its full Settlement history. */
async function reconcileEntryAggregate(tx: Tx, entryId: string) {
  const [entry, settlements] = await Promise.all([
    tx.entry.findUniqueOrThrow({ where: { id: entryId } }),
    tx.settlement.findMany({ where: { entryId } }),
  ])
  const aggregate = recomputeEntryAggregate(settlements, entry.amount)
  await tx.entry.update({ where: { id: entryId }, data: aggregate })
}

/** RECONCILED as long as the transaction has at least one Settlement, PENDING otherwise. */
async function reconcileBankTransactionStatus(tx: Tx, bankTransactionId: string) {
  const count = await tx.settlement.count({ where: { bankTransactionId } })
  await tx.bankTransaction.update({
    where: { id: bankTransactionId },
    data: { status: count > 0 ? "RECONCILED" : "PENDING" },
  })
}

interface InsertSettlementInput {
  entryId: string
  bankTransactionId?: string
  origin: "STATEMENT" | "MANUAL"
  settledAmount: number
  interest?: number
  fine?: number
  discount?: number
  settledAt: Date
  note?: string
}

async function insertSettlement(tx: Tx, organizationId: string, input: InsertSettlementInput) {
  await loadEntry(tx, input.entryId)

  const net = netSettledAmount({
    settledAmount: input.settledAmount,
    interest: input.interest ?? 0,
    fine: input.fine ?? 0,
    discount: input.discount ?? 0,
  })
  if (net <= 0) throw new BusinessError("O desconto não pode ser maior do que o valor liquidado.", "discount")

  if (input.bankTransactionId) {
    // Invariante (ARQUITETURA.md §5.2): o que se concilia numa transação, já
    // com juros, multa e desconto, nunca passa do valor dela.
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)
    const existing = await tx.settlement.findMany({ where: { bankTransactionId: input.bankTransactionId } })
    const total = existing.reduce((sum, settlement) => sum + netSettledAmount(settlement), net)
    if (total > Math.abs(transaction.amount)) {
      throw new BusinessError("A soma dos valores conciliados passa do valor da transação bancária.")
    }
  }

  await tx.settlement.create({
    data: {
      organizationId,
      entryId: input.entryId,
      bankTransactionId: input.bankTransactionId ?? null,
      origin: input.origin,
      settledAmount: input.settledAmount,
      interest: input.interest ?? 0,
      fine: input.fine ?? 0,
      discount: input.discount ?? 0,
      settledAt: input.settledAt,
      note: input.note ?? null,
    },
  })

  await reconcileEntryAggregate(tx, input.entryId)
  if (input.bankTransactionId) await reconcileBankTransactionStatus(tx, input.bankTransactionId)
}

// Transferência (RN-15) não tem contato nem categoria — onde a tela mostra um
// deles, mostra isto no lugar.
const TRANSFER_LABEL = "Transferência"

function toCandidateEntry(entry: { id: string; contact: { name: string } | null; description: string; dueDate: Date; amount: number; settledAmount: number | null; type: CandidateEntry["type"] }): CandidateEntry {
  return {
    id: entry.id,
    contactName: entry.contact?.name ?? TRANSFER_LABEL,
    description: entry.description,
    dueDate: fromDbDate(entry.dueDate),
    amount: entry.amount,
    settledAmount: entry.settledAmount,
    type: entry.type,
  }
}

/** A saída de uma conta é a perna OUT de uma transferência; a entrada, a IN. */
function transferDirectionFor(direction: "RECEIVABLE" | "PAYABLE"): "IN" | "OUT" {
  return direction === "RECEIVABLE" ? "IN" : "OUT"
}

/** For the "Buscar existente" tab — open entries of the given direction, optionally filtered by text. */
export async function listCandidateEntries(
  organizationId: string,
  input: SearchCandidateEntriesInput,
): Promise<CandidateEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const entries = await tx.entry.findMany({
      where: {
        type: input.type,
        status: { in: ["FORECAST", "PARTIAL"] },
        ...(input.query
          ? {
              OR: [
                { description: { contains: input.query, mode: "insensitive" } },
                { contact: { name: { contains: input.query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: { contact: true },
      orderBy: { dueDate: "asc" },
      take: 20,
    })
    return entries.map(toCandidateEntry)
  })
}

/** Automatic suggestion banner — exact-amount matches for one bank transaction. */
export async function suggestMatchesForTransaction(
  organizationId: string,
  bankTransactionId: string,
): Promise<CandidateEntry[]> {
  return withOrganization(organizationId, async (tx) => {
    const transaction = await loadBankTransaction(tx, bankTransactionId)
    const direction = directionForTransactionAmount(transaction.amount)
    const openEntries = await tx.entry.findMany({
      where: {
        status: { in: ["FORECAST", "PARTIAL"] },
        OR: [
          { type: direction },
          { type: "TRANSFER", bankAccountId: transaction.bankAccountId, transferDirection: transferDirectionFor(direction) },
        ],
      },
      include: { contact: true },
    })

    const rankable = openEntries.map((entry) => ({
      id: entry.id,
      amount: entry.amount,
      settledAmount: entry.settledAmount,
      dueDate: fromDbDate(entry.dueDate),
    }))
    const matches = suggestMatches(transaction.amount, fromDbDate(transaction.date), rankable)
    const byId = new Map(openEntries.map((entry) => [entry.id, entry]))
    return matches.map((match) => toCandidateEntry(byId.get(match.id)!))
  })
}

/**
 * What the reconciliation screen needs to render each bank transaction's
 * "Capi" side in one round trip: entries it's already settled against, or —
 * when it isn't settled yet — its automatic match suggestions. Reused for
 * both the initial load and refreshing after an action, so the screen never
 * has to special-case which one it's showing.
 */
export async function getMatchInfoForTransactions(
  organizationId: string,
  bankTransactionIds: string[],
): Promise<TransactionMatchInfo[]> {
  return withOrganization(organizationId, async (tx) => {
    if (bankTransactionIds.length === 0) return []

    const [transactions, settlements] = await Promise.all([
      tx.bankTransaction.findMany({ where: { id: { in: bankTransactionIds } } }),
      tx.settlement.findMany({
        where: { bankTransactionId: { in: bankTransactionIds } },
        include: { entry: { include: { contact: true, category: true } } },
        orderBy: { createdAt: "asc" },
      }),
    ])

    const settlementsByTransaction = new Map<string, MatchedSettlement[]>()
    for (const settlement of settlements) {
      const key = settlement.bankTransactionId!
      const list = settlementsByTransaction.get(key) ?? []
      list.push({
        settlementId: settlement.id,
        entryId: settlement.entryId,
        entryType: settlement.entry.type,
        contactName: settlement.entry.contact?.name ?? TRANSFER_LABEL,
        description: settlement.entry.description,
        categoryName: settlement.entry.category?.name ?? TRANSFER_LABEL,
        dueDate: fromDbDate(settlement.entry.dueDate),
        settledAmount: settlement.settledAmount,
      })
      settlementsByTransaction.set(key, list)
    }

    const unmatched = transactions.filter((t) => !settlementsByTransaction.has(t.id))
    const needsReceivables = unmatched.some((t) => directionForTransactionAmount(t.amount) === "RECEIVABLE")
    const needsPayables = unmatched.some((t) => directionForTransactionAmount(t.amount) === "PAYABLE")

    const [receivableEntries, payableEntries, transferLegs] = await Promise.all([
      needsReceivables
        ? tx.entry.findMany({ where: { type: "RECEIVABLE", status: { in: ["FORECAST", "PARTIAL"] } }, include: { contact: true } })
        : Promise.resolve([]),
      needsPayables
        ? tx.entry.findMany({ where: { type: "PAYABLE", status: { in: ["FORECAST", "PARTIAL"] } }, include: { contact: true } })
        : Promise.resolve([]),
      // A outra perna de uma transferência (RN-15) só concilia com o extrato
      // da própria conta — ao contrário de recebimento/pagamento, filtra por conta.
      unmatched.length > 0
        ? tx.entry.findMany({
            where: {
              type: "TRANSFER",
              status: { in: ["FORECAST", "PARTIAL"] },
              bankAccountId: { in: [...new Set(unmatched.map((t) => t.bankAccountId))] },
            },
            include: { contact: true },
          })
        : Promise.resolve([]),
    ])

    return transactions.map((transaction) => {
      const matches = settlementsByTransaction.get(transaction.id) ?? []
      if (matches.length > 0) return { bankTransactionId: transaction.id, matches, suggestions: [] }

      const direction = directionForTransactionAmount(transaction.amount)
      const pool = [
        ...(direction === "RECEIVABLE" ? receivableEntries : payableEntries),
        ...transferLegs.filter(
          (leg) => leg.bankAccountId === transaction.bankAccountId && leg.transferDirection === transferDirectionFor(direction),
        ),
      ]
      const rankable = pool.map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        settledAmount: entry.settledAmount,
        dueDate: fromDbDate(entry.dueDate),
      }))
      const suggested = suggestMatches(transaction.amount, fromDbDate(transaction.date), rankable)
      const byId = new Map(pool.map((entry) => [entry.id, entry]))
      return {
        bankTransactionId: transaction.id,
        matches: [],
        suggestions: suggested.map((s) => toCandidateEntry(byId.get(s.id)!)),
      }
    })
  })
}

/** Links one bank transaction to one existing entry (RN-01, extrato path). */
export async function createSettlement(organizationId: string, input: CreateSettlementInput): Promise<void> {
  await withOrganization(organizationId, (tx) =>
    insertSettlement(tx, organizationId, { ...input, origin: "STATEMENT" }),
  )
}

/** Quitação múltipla (RN-07) — one bank transaction settling several entries at once. */
export async function createSettlementBatch(organizationId: string, input: CreateSettlementBatchInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadBankTransaction(tx, input.bankTransactionId)
    for (const item of input.items) {
      await insertSettlement(tx, organizationId, { ...item, bankTransactionId: input.bankTransactionId, origin: "STATEMENT" })
    }
  })
}

/** Desfazer (RN-12/RN-22) — removing the Settlement row and recomputing is enough, there's no ledger to reverse. */
export async function undoSettlement(organizationId: string, settlementId: string): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const settlement = await tx.settlement.findUnique({ where: { id: settlementId } })
    if (!settlement) throw new NotFound("Conciliação")

    await tx.settlement.delete({ where: { id: settlementId } })
    await reconcileEntryAggregate(tx, settlement.entryId)
    if (settlement.bankTransactionId) await reconcileBankTransactionStatus(tx, settlement.bankTransactionId)
  })
}

/**
 * Desconciliar pelo extrato: desfaz todas as Settlements da transação de uma
 * vez — numa quitação múltipla (RN-07) são várias. A transação volta a
 * PENDING, reaparecendo na tela de conciliação, e cada lançamento recalcula
 * o próprio status (em aberto, ou parcial se tiver outras baixas).
 */
export async function undoBankTransactionReconciliation(organizationId: string, bankTransactionId: string): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadBankTransaction(tx, bankTransactionId)

    const settlements = await tx.settlement.findMany({ where: { bankTransactionId }, select: { entryId: true } })
    await tx.settlement.deleteMany({ where: { bankTransactionId } })
    for (const entryId of new Set(settlements.map((settlement) => settlement.entryId))) {
      await reconcileEntryAggregate(tx, entryId)
      await discardUnsettledTransfer(tx, entryId)
    }
    await reconcileBankTransactionStatus(tx, bankTransactionId)
  })
}

/**
 * A transferência nasce da conciliação e não tem tela própria: se, depois de
 * desconciliar, nenhuma das duas pernas tem mais liquidação, ela deixa de
 * existir — senão a outra perna ficaria sugerida para sempre na outra conta.
 * Com uma perna ainda conciliada, a transferência fica.
 */
async function discardUnsettledTransfer(tx: Tx, entryId: string) {
  const entry = await tx.entry.findUniqueOrThrow({ where: { id: entryId }, include: { transferPairOf: true } })
  if (entry.type !== "TRANSFER") return

  const legIds = [entry.id, entry.transferPairId ?? entry.transferPairOf?.id].filter((id): id is string => !!id)
  const remaining = await tx.settlement.count({ where: { entryId: { in: legIds } } })
  if (remaining > 0) return

  // A perna OUT referencia a IN — solta o vínculo antes de apagar as duas.
  await tx.entry.updateMany({ where: { id: { in: legIds } }, data: { transferPairId: null } })
  await tx.entry.deleteMany({ where: { id: { in: legIds } } })
}

/**
 * Baixa manual (RN-20) — date + value + free-text "conta de terceiro" note.
 * Never touches a bank transaction and never credits a favorecido (RN-01a:
 * only a STATEMENT-origin settlement generates balance). `settledAmount`
 * omitted quits whatever remains in one go; given, it's a recebimento/
 * pagamento parcial (RN-06) and must not exceed what's left.
 */
export async function manualSettleEntry(organizationId: string, input: ManualSettleInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const entry = await loadEntry(tx, input.entryId)
    const remaining = entry.amount - (entry.settledAmount ?? 0)
    if (remaining <= 0) {
      throw new BusinessError("Este lançamento já está totalmente liquidado.")
    }
    if (input.settledAmount !== undefined && input.settledAmount > remaining) {
      throw new BusinessError("O valor não pode ser maior do que o saldo em aberto.", "settledAmount")
    }

    await insertSettlement(tx, organizationId, {
      entryId: input.entryId,
      origin: "MANUAL",
      settledAmount: input.settledAmount ?? remaining,
      settledAt: input.settledAt,
      note: input.note,
    })
  })
}

/**
 * The reconciliation screen's "create a payment" path — a saída with no
 * existing candidate becomes a standalone PAYABLE entry, created already
 * settled by that same transaction. Mirrors expenses/service.ts#createExpense
 * for a single, already-paid installment.
 */
export async function createAndSettlePayable(organizationId: string, input: CreateAndSettlePayableInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadContact(tx, input.contactId)
    await loadExpenseCategory(tx, input.categoryId)
    await loadBankAccount(tx, input.bankAccountId)
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)

    const entry = await tx.entry.create({
      data: {
        organizationId,
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        type: "PAYABLE",
        description: input.description,
        dueDate: transaction.date,
        amount: input.settledAmount,
        paymentMethod: "BANK_TRANSFER",
      },
    })

    await insertSettlement(tx, organizationId, {
      entryId: entry.id,
      bankTransactionId: input.bankTransactionId,
      origin: "STATEMENT",
      settledAmount: input.settledAmount,
      settledAt: input.settledAt,
    })
  })
}

/**
 * The reconciliation screen's "create a receipt" path — an entrada with no
 * existing candidate becomes a standalone RECEIVABLE entry, created already
 * settled by that same transaction. Mirrors createAndSettlePayable above,
 * INCOME category instead of EXPENSE.
 */
export async function createAndSettleReceivable(organizationId: string, input: CreateAndSettlePayableInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    await loadContact(tx, input.contactId)
    await loadIncomeCategory(tx, input.categoryId)
    await loadBankAccount(tx, input.bankAccountId)
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)

    const entry = await tx.entry.create({
      data: {
        organizationId,
        contactId: input.contactId,
        categoryId: input.categoryId,
        bankAccountId: input.bankAccountId,
        type: "RECEIVABLE",
        description: input.description,
        dueDate: transaction.date,
        amount: input.settledAmount,
        paymentMethod: "BANK_TRANSFER",
      },
    })

    await insertSettlement(tx, organizationId, {
      entryId: entry.id,
      bankTransactionId: input.bankTransactionId,
      origin: "STATEMENT",
      settledAmount: input.settledAmount,
      settledAt: input.settledAt,
    })
  })
}

/**
 * Transferência entre contas próprias (RN-15), criada pela tela de
 * conciliação: o valor e a data vêm da transação bancária, e o usuário só
 * informa a conta contrária. Gera as duas pernas — a desta conta já
 * conciliada com a transação, a da outra conta prevista, para ser conciliada
 * quando o extrato de lá chegar. Fora da custódia (RN-14): não tem contato,
 * categoria nem destinação.
 */
export async function createAndSettleTransfer(organizationId: string, input: CreateAndSettleTransferInput): Promise<void> {
  await withOrganization(organizationId, async (tx) => {
    const transaction = await loadBankTransaction(tx, input.bankTransactionId)
    if (input.counterpartBankAccountId === transaction.bankAccountId) {
      throw new BusinessError("Selecione uma conta diferente da conta do extrato.", "counterpartBankAccountId")
    }
    const [thisAccount, counterpart] = await Promise.all([
      loadBankAccount(tx, transaction.bankAccountId),
      loadBankAccount(tx, input.counterpartBankAccountId),
    ])

    // Saída do extrato: esta conta é a origem. Entrada: é o destino.
    const isOutgoing = directionForTransactionAmount(transaction.amount) === "PAYABLE"
    const [origin, destination] = isOutgoing ? [thisAccount, counterpart] : [counterpart, thisAccount]
    const amount = Math.abs(transaction.amount)
    const leg = {
      organizationId,
      type: "TRANSFER" as const,
      description: `Transferência de ${origin.name} para ${destination.name}`,
      dueDate: transaction.date,
      amount,
      paymentMethod: "BANK_TRANSFER" as const,
    }

    const incoming = await tx.entry.create({
      data: { ...leg, bankAccountId: destination.id, transferDirection: "IN" },
    })
    const outgoing = await tx.entry.create({
      data: { ...leg, bankAccountId: origin.id, transferDirection: "OUT", transferPairId: incoming.id },
    })

    await insertSettlement(tx, organizationId, {
      entryId: isOutgoing ? outgoing.id : incoming.id,
      bankTransactionId: transaction.id,
      origin: "STATEMENT",
      settledAmount: amount,
      settledAt: transaction.date,
    })
  })
}

/** The "Emitir recibo" printable view's data, for one Settlement row of the accounts detail Sheet's history tab. */
export async function getSettlementReceipt(organizationId: string, settlementId: string): Promise<SettlementReceipt> {
  return withOrganization(organizationId, async (tx) => {
    const settlement = await tx.settlement.findUnique({
      where: { id: settlementId },
      include: {
        entry: {
          include: {
            contact: true,
            category: true,
            sale: { select: { installmentsCount: true, billingType: true } },
          },
        },
      },
    })
    if (!settlement) throw new NotFound("Liquidação")

    return {
      id: settlement.id,
      settledAt: fromDbDate(settlement.settledAt),
      settledAmount: settlement.settledAmount,
      interest: settlement.interest,
      fine: settlement.fine,
      discount: settlement.discount,
      note: settlement.note,
      entryType: settlement.entry.type,
      entryDescription: settlement.entry.description,
      contactName: settlement.entry.contact?.name ?? TRANSFER_LABEL,
      categoryName: settlement.entry.category?.name ?? TRANSFER_LABEL,
      installment:
        settlement.entry.sale && settlement.entry.sale.billingType === "INSTALLMENTS" && settlement.entry.installmentNumber
          ? `${settlement.entry.installmentNumber}/${settlement.entry.sale.installmentsCount}`
          : null,
    }
  })
}
