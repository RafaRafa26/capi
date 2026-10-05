"use server";

import { revalidatePath } from "next/cache";

import { orgPath } from "@/lib/org-path";
import { requireSession } from "@/modules/auth/session";
import { markerInputSchema, updateMarkerSchema } from "@/modules/markers/schema";
import { createMarker, deleteMarker, updateMarker } from "@/modules/markers/service";
import { failure, type Result } from "@/shared/errors";

// The lists show each lançamento's marcador, so they go stale too.
function revalidateMarkerScreens(organizationId: string) {
  revalidatePath(orgPath(organizationId, "/markers"));
  revalidatePath(orgPath(organizationId, "/payables"));
  revalidatePath(orgPath(organizationId, "/receivables"));
}

export async function createMarkerAction(input: unknown): Promise<Result> {
  try {
    const session = await requireSession("write");
    const parsed = markerInputSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createMarker(session.organizationId, parsed.data);
    revalidateMarkerScreens(session.organizationId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function updateMarkerAction(id: string, input: unknown): Promise<Result> {
  try {
    const session = await requireSession("write");
    const parsed = updateMarkerSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await updateMarker(session.organizationId, id, parsed.data);
    revalidateMarkerScreens(session.organizationId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteMarkerAction(id: string): Promise<Result> {
  try {
    const session = await requireSession("write");
    await deleteMarker(session.organizationId, id);
    revalidateMarkerScreens(session.organizationId);
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
