import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prismaAdmin } from "@/db/client";
import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment";
import { BusinessError, NotFound } from "@/shared/errors";
import { createMarker, deleteMarker, listMarkers, updateMarker } from "./service";

let org: TestOrg;
let otherOrg: TestOrg;

beforeAll(async () => {
  org = await createTestOrganization("Markers");
  otherOrg = await createTestOrganization("Markers other");
});

afterAll(async () => {
  await removeTestOrganizations([org.id, otherOrg.id]);
});

describe("markers (RN-36)", () => {
  it("creates and lists a marcador", async () => {
    const marker = await createMarker(org.id, { type: "RECEIVABLE", name: "Cobrado, sem retorno", color: "orange" });
    expect(marker).toMatchObject({ type: "RECEIVABLE", name: "Cobrado, sem retorno", color: "orange" });
    expect((await listMarkers(org.id)).map((m) => m.id)).toContain(marker.id);
  });

  it("rejects a duplicate name on the same side, but allows it on the other", async () => {
    await createMarker(org.id, { type: "RECEIVABLE", name: "Em negociação", color: "violet" });
    await expect(
      createMarker(org.id, { type: "RECEIVABLE", name: "Em negociação", color: "blue" }),
    ).rejects.toThrow(BusinessError);

    const payable = await createMarker(org.id, { type: "PAYABLE", name: "Em negociação", color: "violet" });
    expect(payable.type).toBe("PAYABLE");
  });

  it("renames and recolors a marcador", async () => {
    const marker = await createMarker(org.id, { type: "PAYABLE", name: "Agendado", color: "blue" });
    const updated = await updateMarker(org.id, marker.id, { name: "Pagamento agendado", color: "green" });
    expect(updated).toMatchObject({ name: "Pagamento agendado", color: "green", type: "PAYABLE" });
  });

  it("deleting a marcador unmarks its entries but keeps their observação", async () => {
    const marker = await createMarker(org.id, { type: "PAYABLE", name: "Contestado", color: "gray" });
    const entry = await prismaAdmin.entry.create({
      data: {
        organizationId: org.id,
        contactId: org.contactId,
        categoryId: org.categoryId,
        bankAccountId: org.bankAccountId,
        type: "PAYABLE",
        description: "Despesa marcada",
        dueDate: new Date(2026, 8, 10),
        amount: 1_000,
        paymentMethod: "PIX",
        markerId: marker.id,
        notes: "Valor errado no boleto",
      },
    });

    await deleteMarker(org.id, marker.id);

    const saved = await prismaAdmin.entry.findUniqueOrThrow({ where: { id: entry.id } });
    expect(saved.markerId).toBeNull();
    expect(saved.notes).toBe("Valor errado no boleto");
  });

  it("can't see or touch another organization's marcadores", async () => {
    const foreign = await createMarker(otherOrg.id, { type: "RECEIVABLE", name: "Alheio", color: "red" });

    expect((await listMarkers(org.id)).map((m) => m.id)).not.toContain(foreign.id);
    await expect(updateMarker(org.id, foreign.id, { name: "x", color: "red" })).rejects.toThrow(NotFound);
    await expect(deleteMarker(org.id, foreign.id)).rejects.toThrow(NotFound);
  });
});
