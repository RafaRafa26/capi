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
 * Saldo de caixa (ARQUITETURA.md §2): initialBalance + a soma das
 * BankTransaction já RECONCILED daquela conta — não conta o que ainda está
 * importado mas sem conciliar (RN confirmada com o Rafael: o saldo só se
 * move quando a conciliação acontece, não só pela importação do extrato).
 */
export async function getBankAccountsOverview(organizationId: string): Promise<BankAccountOverview[]> {
  return withOrganization(organizationId, async (tx) => {
    const accounts = await tx.bankAccount.findMany({ where: { active: true }, select: FIELDS, orderBy: { name: "asc" } });
    if (accounts.length === 0) return [];

    const [reconciledSums, pendingCounts] = await Promise.all([
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
    ]);

    const sumByAccount = new Map(reconciledSums.map((row) => [row.bankAccountId, row._sum.amount ?? 0]));
    const pendingByAccount = new Map(pendingCounts.map((row) => [row.bankAccountId, row._count._all]));

    return accounts.map((account) => ({
      ...fromDatabase(account),
      currentBalance: account.initialBalance + (sumByAccount.get(account.id) ?? 0),
      pendingCount: pendingByAccount.get(account.id) ?? 0,
    }));
  });
}

/** Extrato somente-leitura de uma conta: só as transações já conciliadas, com saldo corrente. */
export async function getBankAccountStatement(organizationId: string, bankAccountId: string): Promise<BankAccountStatement> {
  return withOrganization(organizationId, async (tx) => {
    const bankAccount = await loadBankAccount(tx, bankAccountId);

    const transactions = await tx.bankTransaction.findMany({
      where: { bankAccountId, status: "RECONCILED" },
      include: {
        settlements: { include: { entry: { include: { contact: true } } } },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    let runningBalance = bankAccount.initialBalance;
    const lines = transactions.map((transaction) => {
      runningBalance += transaction.amount;
      return {
        bankTransactionId: transaction.id,
        date: fromDbDate(transaction.date),
        description: transaction.description,
        amount: transaction.amount,
        runningBalance,
        settledEntries: transaction.settlements.map((settlement) => ({
          entryId: settlement.entryId,
          contactName: settlement.entry.contact.name,
          description: settlement.entry.description,
        })),
      };
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
