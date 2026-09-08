"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/modules/auth/session";
import { createCategory, moveSubcategory, renameCategory } from "@/modules/categories/service";
import { categoryInputSchema, renameCategorySchema } from "@/modules/categories/schema";
import { failure, type Result } from "@/shared/errors";

export async function createCategoryAction(form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const parentId = form.get("parentId");
    const parsed = categoryInputSchema.safeParse({
      name: String(form.get("name") ?? ""),
      type: form.get("type") ? String(form.get("type")) : undefined,
      parentId: parentId ? String(parentId) : undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await createCategory(session.organizationId, parsed.data);
    revalidatePath("/categories");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function renameCategoryAction(id: string, form: FormData): Promise<Result> {
  try {
    const session = await requireSession();

    const parsed = renameCategorySchema.safeParse({ name: String(form.get("name") ?? "") });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await renameCategory(session.organizationId, id, parsed.data);
    revalidatePath("/categories");

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function moveSubcategoryAction(id: string, newParentId: string): Promise<Result> {
  try {
    const session = await requireSession();
    await moveSubcategory(session.organizationId, id, newParentId);
    revalidatePath("/categories");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
