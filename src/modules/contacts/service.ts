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
  document: string;
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

function toDatabase(input: ContactInput) {
  return {
    name: input.name,
    legalName: input.personType === "COMPANY" ? input.legalName || null : null,
    document: input.document,
    personType: input.personType,
    contactType: input.contactType,
    phone: input.phone || null,
    email: input.email || null,
    city: input.city || null,
    state: input.state || null,
    bankDetails:
      input.contactType === "BENEFICIARY"
        ? ((input.bankDetails ?? Prisma.JsonNull) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
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
    await rejectDuplicateDocument(tx, input.document);
    return tx.contact.create({
      data: { organizationId, ...toDatabase(input) },
      select: FIELDS,
    });
  });
  return fromDatabase(row);
}

export async function updateContact(
  organizationId: string,
  id: string,
  input: ContactInput,
): Promise<Contact> {
  const row = await withOrganization(organizationId, async (tx) => {
    const current = await tx.contact.findUnique({ where: { id } });
    if (!current) throw new NotFound("Contato");

    await rejectDuplicateDocument(tx, input.document, id);
    return tx.contact.update({
      where: { id },
      data: toDatabase(input),
      select: FIELDS,
    });
  });
  return fromDatabase(row);
}
