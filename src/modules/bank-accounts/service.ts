import "server-only";

import { fromDbDate, withOrganization, type Tx } from "@/db/client";
import { NotFound } from "@/shared/errors";
import type { BankAccountInput } from "./schema";
import type { BankAccount, BankAccountOverview, BankAccountStatement } from "./types";

const FIELDS = {
  id: true,
  name: true,
  bank: true,
  branchNumber: true,
  accountNumber: true,
  kind: true,
  holderType: true,
  controlStartDate: true,
  initialBalance: true,
  active: true,
} as const;

// controlStartDate é @db.Date: sem isso, chega um dia antes na tela (ver fromDbDate).
function fromDatabase<T extends BankAccount>(row: T): T {
  return { ...row, controlStartDate: fromDbDate(row.controlStartDate) };
}

export async function listBankAccounts(organizationId: string): Promise<BankAccount[]> {
  const rows = await withOrganization(organizationId, (tx) =>
    tx.bankAccount.findMany({ select: FIELDS, orderBy: { name: "asc" } }),
  );
  return rows.map(fromDatabase);
}

async function loadBankAccount(tx: Tx, bankAccountId: string): Promise<BankAccount> {
  const bankAccount = await tx.bankAccount.findUnique({ where: { id: bankAccountId }, select: FIELDS });
  if (!bankAccount) throw new NotFound("Conta bancária");
  return fromDatabase(bankAccount);
}

export async function getBankAccount(organizationId: string, bankAccountId: string): Promise<BankAccount> {
  return withOrganization(organizationId, (tx) => loadBankAccount(tx, bankAccountId));
}

/**
 * Pernas de transferência (RN-15) ainda não conciliadas — a que nasceu
 * prevista na outra conta quando a transferência foi criada pela conciliação.
 * Entram no extrato e no saldo (exceção da RN-21) até o extrato daquela conta
 * chegar e conciliá-las; a partir daí quem conta é a BankTransaction.
 * Entrada (IN) soma, saída (OUT) subtrai — só o que ainda falta conciliar.
 */
async function findPendingTransferLegs(tx: Tx, bankAccountIds: string[]) {
  const legs = await tx.entry.findMany({
    where: { type: "TRANSFER", status: { in: ["FORECAST", "PARTIAL"] }, bankAccountId: { in: bankAccountIds } },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  });
  return legs.map((leg) => {
    const remaining = leg.amount - (leg.settledAmount ?? 0);
    return { ...leg, signedAmount: leg.transferDirection === "OUT" ? -remaining : remaining };
  });
}

/**
 * Saldo de caixa (ARQUITETURA.md §2): initialBalance + a soma das
 * BankTransaction já RECONCILED daquela conta — não conta o que ainda está
 * importado mas sem conciliar (RN confirmada com o Rafael: o saldo só se
 * move quando a conciliação acontece, não só pela importação do extrato).
 * A exceção são as pernas de transferência ainda não conciliadas, que já
 * contam (ver findPendingTransferLegs).
 */
export async function getBankAccountsOverview(organizationId: string): Promise<BankAccountOverview[]> {
  return withOrganization(organizationId, async (tx) => {
    const accounts = await tx.bankAccount.findMany({ where: { active: true }, select: FIELDS, orderBy: { name: "asc" } });
    if (accounts.length === 0) return [];

    const [reconciledSums, pendingCounts, pendingLegs] = await Promise.all([
      tx.bankTransaction.groupBy({
        by: ["bankAccountId"],
        where: { bankAccountId: { in: accounts.map((a) => a.id) }, status: "RECONCILED" },
        _sum: { amount: true },
      }),
      tx.bankTransaction.groupBy({
        by: ["bankAccountId"],
        where: { bankAccountId: { in: accounts.map((a) => a.id) }, status: "PENDING" },
        _count: { _all: true },
      }),
      findPendingTransferLegs(tx, accounts.map((a) => a.id)),
    ]);

    const sumByAccount = new Map(reconciledSums.map((row) => [row.bankAccountId, row._sum.amount ?? 0]));
    for (const leg of pendingLegs) {
      sumByAccount.set(leg.bankAccountId!, (sumByAccount.get(leg.bankAccountId!) ?? 0) + leg.signedAmount);
    }
    const pendingByAccount = new Map(pendingCounts.map((row) => [row.bankAccountId, row._count._all]));

    return accounts.map((account) => ({
      ...fromDatabase(account),
      currentBalance: account.initialBalance + (sumByAccount.get(account.id) ?? 0),
      pendingCount: pendingByAccount.get(account.id) ?? 0,
    }));
  });
}

/**
 * Extrato somente-leitura de uma conta, com saldo corrente: as transações já
 * conciliadas e as pernas de transferência que ainda esperam o extrato desta
 * conta (sem BankTransaction — ver findPendingTransferLegs).
 */
export async function getBankAccountStatement(organizationId: string, bankAccountId: string): Promise<BankAccountStatement> {
  return withOrganization(organizationId, async (tx) => {
    const bankAccount = await loadBankAccount(tx, bankAccountId);

    const [transactions, pendingLegs] = await Promise.all([
      tx.bankTransaction.findMany({
        where: { bankAccountId, status: "RECONCILED" },
        include: {
          settlements: { include: { entry: { include: { contact: true } } } },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      findPendingTransferLegs(tx, [bankAccountId]),
    ]);

    // createdAt só desempata o dia — não vai para a linha do extrato.
    const rows = [
      ...transactions.map((transaction) => ({
        createdAt: transaction.createdAt,
        line: {
          id: transaction.id,
          bankTransactionId: transaction.id as string | null,
          date: fromDbDate(transaction.date),
          description: transaction.description,
          amount: transaction.amount,
          entries: transaction.settlements.map((settlement) => ({
            entryId: settlement.entryId,
            entryType: settlement.entry.type,
            contactName: settlement.entry.contact?.name ?? "Transferência",
            description: settlement.entry.description,
            amount: settlement.settledAmount,
          })),
        },
      })),
      ...pendingLegs.map((leg) => ({
        createdAt: leg.createdAt,
        line: {
          id: leg.id,
          bankTransactionId: null,
          date: fromDbDate(leg.dueDate),
          description: leg.description,
          amount: leg.signedAmount,
          entries: [
            {
              entryId: leg.id,
              entryType: leg.type,
              contactName: "Transferência",
              description: leg.description,
              amount: Math.abs(leg.signedAmount),
            },
          ],
        },
      })),
    ].sort((a, b) => a.line.date.getTime() - b.line.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime());

    let runningBalance = bankAccount.initialBalance;
    const lines = rows.map(({ line }) => {
      runningBalance += line.amount;
      return { ...line, runningBalance };
    });

    return {
      bankAccount,
      currentBalance: runningBalance,
      // Ordem cronológica (mais antiga primeiro) — é o que o gráfico precisa
      // pro eixo X fazer sentido. Quem quiser mostrar mais recente primeiro
      // (a tabela do extrato) inverte na hora de renderizar.
      lines,
    };
  });
}

export async function createBankAccount(
  organizationId: string,
  input: BankAccountInput,
): Promise<BankAccount> {
  const row = await withOrganization(organizationId, (tx) =>
    tx.bankAccount.create({
      data: { organizationId, ...input },
      select: FIELDS,
    }),
  );
  return fromDatabase(row);
}

export async function updateBankAccount(
  organizationId: string,
  bankAccountId: string,
  input: BankAccountInput,
): Promise<BankAccount> {
  const row = await withOrganization(organizationId, async (tx) => {
    await loadBankAccount(tx, bankAccountId);
    return tx.bankAccount.update({ where: { id: bankAccountId }, data: input, select: FIELDS });
  });
  return fromDatabase(row);
}
