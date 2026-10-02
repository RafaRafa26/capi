import "server-only";

import { withOrganization, type Tx } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import { DEFAULT_MARKERS } from "./defaults";
import type { MarkerInput, UpdateMarkerInput } from "./schema";
import type { Marker } from "./types";

const FIELDS = { id: true, type: true, name: true, color: true } as const;

async function rejectDuplicateName(tx: Tx, type: Marker["type"], name: string, excludingId?: string) {
  const existing = await tx.marker.findFirst({
    where: { type, name, ...(excludingId ? { id: { not: excludingId } } : {}) },
  });
  if (existing) {
    throw new BusinessError("Já existe um marcador com esse nome.", "name");
  }
}

/** Gives a brand-new organization the default marcadores (RN-36), inside its creation transaction. */
export async function createDefaultMarkers(tx: Tx, organizationId: string): Promise<void> {
  await tx.marker.createMany({
    data: DEFAULT_MARKERS.map((marker) => ({ organizationId, ...marker })),
  });
}

export async function listMarkers(organizationId: string): Promise<Marker[]> {
  return withOrganization(organizationId, async (tx) => {
    const markers = await tx.marker.findMany({ select: FIELDS, orderBy: { name: "asc" } });
    return markers as Marker[];
  });
}

export async function createMarker(organizationId: string, input: MarkerInput): Promise<Marker> {
  return withOrganization(organizationId, async (tx) => {
    await rejectDuplicateName(tx, input.type, input.name);
    const marker = await tx.marker.create({ data: { organizationId, ...input }, select: FIELDS });
    return marker as Marker;
  });
}

export async function updateMarker(organizationId: string, id: string, input: UpdateMarkerInput): Promise<Marker> {
  return withOrganization(organizationId, async (tx) => {
    const current = await tx.marker.findUnique({ where: { id } });
    if (!current || current.type === "TRANSFER") throw new NotFound("Marcador");

    await rejectDuplicateName(tx, current.type, input.name, id);

    const marker = await tx.marker.update({ where: { id }, data: input, select: FIELDS });
    return marker as Marker;
  });
}

/** Excluir só tira o marcador dos lançamentos (ON DELETE SET NULL) — a observação de cada um fica. */
export async function deleteMarker(organizationId: string, id: string): Promise<void> {
  return withOrganization(organizationId, async (tx) => {
    const current = await tx.marker.findUnique({ where: { id } });
    if (!current) throw new NotFound("Marcador");
    await tx.marker.delete({ where: { id } });
  });
}
