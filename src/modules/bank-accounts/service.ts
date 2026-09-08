import "server-only";

import { withOrganization } from "@/db/client";
import type { BankAccountInput } from "./schema";
import type { BankAccount } from "./types";

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

export async function listBankAccounts(organizationId: string): Promise<BankAccount[]> {
  return withOrganization(organizationId, (tx) =>
    tx.bankAccount.findMany({ select: FIELDS, orderBy: { name: "asc" } }),
  );
}

export async function createBankAccount(
  organizationId: string,
  input: BankAccountInput,
): Promise<BankAccount> {
  return withOrganization(organizationId, (tx) =>
    tx.bankAccount.create({
      data: { organizationId, ...input },
      select: FIELDS,
    }),
  );
}
