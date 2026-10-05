import "server-only";

import { Prisma } from "@/db/generated/client";
import { withOrganization } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import type { ContactInput } from "./schema";
import type { BankDetails, Contact } from "./types";

const FIELDS = {
  id: true,
  name: true,
  legalName: true,
  document: true,
  personType: true,
  contactType: true,
  phone: true,
  email: true,
  city: true,
  state: true,
  bankDetails: true,
  active: true,
} as const;

type ContactRow = {
  id: string;
  name: string;
  legalName: string | null;
  document: string | null;
  personType: Contact["personType"];
  contactType: Contact["contactType"];
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  bankDetails: unknown;
  active: boolean;
};

function fromDatabase(row: ContactRow): Contact {
  return { ...row, bankDetails: (row.bankDetails as BankDetails | null) ?? null };
}

// Os seis campos sempre presentes (vazios como ""), ou null quando nenhum foi
// preenchido — quem lê bankDetails não precisa checar campo a campo.
function bankDetailsToDatabase(input: ContactInput): BankDetails | null {
  if (input.contactType !== "BENEFICIARY" || !input.bankDetails) return null;
  const { pixKey, bank, branchNumber, accountNumber, accountType, accountHolder } = input.bankDetails;
  const details: BankDetails = {
    pixKey: pixKey ?? "",
    bank: bank ?? "",
    branchNumber: branchNumber ?? "",
    accountNumber: accountNumber ?? "",
    accountType: accountType ?? "",
    accountHolder: accountHolder ?? "",
  };
  return Object.values(details).some(Boolean) ? details : null;
}

function toDatabase(input: ContactInput) {
  const bankDetails = bankDetailsToDatabase(input);
  return {
    name: input.name,
    legalName: input.personType === "COMPANY" ? input.legalName || null : null,
    // null, não "": a unicidade do documento ignora nulos, então vários
    // contatos podem ficar sem documento.
    document: input.document || null,
    personType: input.personType,
    contactType: input.contactType,
    phone: input.phone || null,
    email: input.email || null,
    city: input.city || null,
    state: input.state || null,
    bankDetails: bankDetails ? { ...bankDetails } : Prisma.JsonNull,
  };
}

async function rejectDuplicateDocument(
  tx: Parameters<Parameters<typeof withOrganization>[1]>[0],
  document: string,
  excludingId?: string,
) {
  const existing = await tx.contact.findFirst({
    where: { document, ...(excludingId ? { id: { not: excludingId } } : {}) },
  });
  if (existing) throw new BusinessError("Já existe um contato com esse documento.", "document");
}

export async function listContacts(organizationId: string): Promise<Contact[]> {
  const rows = await withOrganization(organizationId, (tx) =>
    tx.contact.findMany({ select: FIELDS, orderBy: { name: "asc" } }),
  );
  return rows.map(fromDatabase);
}

export async function getContact(organizationId: string, id: string): Promise<Contact | null> {
  const row = await withOrganization(organizationId, (tx) =>
    tx.contact.findUnique({ where: { id }, select: FIELDS }),
  );
  return row ? fromDatabase(row) : null;
}

export async function createContact(
  organizationId: string,
  input: ContactInput,
): Promise<Contact> {
  const row = await withOrganization(organizationId, async (tx) => {
    if (input.document) await rejectDuplicateDocument(tx, input.document);
    return tx.contact.create({
      data: { organizationId, ...toDatabase(input) },
      select: FIELDS,
    });
  });
  return fromDatabase(row);
}

/** Quick-add from the new-sale/new-expense screens — name and type only, no document yet. */
export async function createQuickContact(
  organizationId: string,
  name: string,
  contactType: Contact["contactType"],
): Promise<Contact> {
  const row = await withOrganization(organizationId, (tx) =>
    tx.contact.create({
      data: {
        organizationId,
        name,
        document: null,
        personType: "INDIVIDUAL",
        contactType,
      },
      select: FIELDS,
    }),
  );
  return fromDatabase(row);
}

export async function updateContact(
  organizationId: string,
  id: string,
  input: ContactInput,
): Promise<Contact> {
  const row = await withOrganization(organizationId, async (tx) => {
    const current = await tx.contact.findUnique({
      where: { id },
      select: { contactType: true, _count: { select: { beneficiaryAllocations: true, payouts: true } } },
    });
    if (!current) throw new NotFound("Contato");

    // Repasses e rateios só enxergam contatos do tipo Favorecido — trocar o
    // tipo esconderia o que já foi lançado para ele.
    const { beneficiaryAllocations, payouts } = current._count;
    if (
      current.contactType === "BENEFICIARY" &&
      input.contactType !== "BENEFICIARY" &&
      beneficiaryAllocations + payouts > 0
    ) {
      throw new BusinessError("Este favorecido já tem vendas ou repasses — não dá para trocar o tipo.", "contactType");
    }

    if (input.document) await rejectDuplicateDocument(tx, input.document, id);
    return tx.contact.update({
      where: { id },
      data: toDatabase(input),
      select: FIELDS,
    });
  });
  return fromDatabase(row);
}
