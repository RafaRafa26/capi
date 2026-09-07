import "server-only";

import { withOrganization } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import type { ContactInput } from "./schema";
import type { Contact } from "./types";

const FIELDS = {
  id: true,
  name: true,
  document: true,
  personType: true,
  phone: true,
  email: true,
  city: true,
  state: true,
  active: true,
} as const;

function toDatabase(input: ContactInput) {
  return {
    name: input.name,
    document: input.document,
    personType: input.personType,
    phone: input.phone || null,
    email: input.email || null,
    city: input.city || null,
    state: input.state || null,
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
  return withOrganization(organizationId, (tx) =>
    tx.contact.findMany({ select: FIELDS, orderBy: { name: "asc" } }),
  );
}

export async function getContact(organizationId: string, id: string): Promise<Contact | null> {
  return withOrganization(organizationId, (tx) =>
    tx.contact.findUnique({ where: { id }, select: FIELDS }),
  );
}

export async function createContact(
  organizationId: string,
  input: ContactInput,
): Promise<Contact> {
  return withOrganization(organizationId, async (tx) => {
    await rejectDuplicateDocument(tx, input.document);
    return tx.contact.create({
      data: { organizationId, ...toDatabase(input) },
      select: FIELDS,
    });
  });
}

export async function updateContact(
  organizationId: string,
  id: string,
  input: ContactInput,
): Promise<Contact> {
  return withOrganization(organizationId, async (tx) => {
    const current = await tx.contact.findUnique({ where: { id } });
    if (!current) throw new NotFound("Contato");

    await rejectDuplicateDocument(tx, input.document, id);
    return tx.contact.update({
      where: { id },
      data: toDatabase(input),
      select: FIELDS,
    });
  });
}
