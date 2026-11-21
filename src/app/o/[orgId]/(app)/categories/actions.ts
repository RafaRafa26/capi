"use server";

import { revalidatePath } from "next/cache";

import { orgPath } from "@/lib/org-path";
import { requireSession } from "@/modules/auth/session";
import { createCategory, createQuickCategory, moveSubcategory, renameCategory } from "@/modules/categories/service";
import { categoryInputSchema, quickCategorySchema, renameCategorySchema } from "@/modules/categories/schema";
import { failure, type Result } from "@/shared/errors";
import type { Category } from "@/modules/categories/types";

export async function createCategoryAction(form: FormData): Promise<Result<Category>> {
  try {
    const session = await requireSession("write");

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

    const category = await createCategory(session.organizationId, parsed.data);
    revalidatePath(orgPath(session.organizationId, "/categories"));

    return { ok: true, data: category };
  } catch (error) {
    return failure(error);
  }
}

/** Quick-add used by the Registrar sheet and the reconciliation pickers. */
export async function createQuickCategoryAction(
  form: FormData,
): Promise<Result<{ category: Category; group: Category | null }>> {
  try {
    const session = await requireSession("write");

    const groupId = form.get("groupId");
    const groupName = form.get("groupName");
    const parsed = quickCategorySchema.safeParse({
      name: String(form.get("name") ?? ""),
      type: String(form.get("type") ?? ""),
      groupId: groupId ? String(groupId) : undefined,
      groupName: groupName ? String(groupName) : undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    const created = await createQuickCategory(session.organizationId, parsed.data);
    revalidatePath(orgPath(session.organizationId, "/categories"));

    return { ok: true, data: created };
  } catch (error) {
    return failure(error);
  }
}

export async function renameCategoryAction(id: string, form: FormData): Promise<Result> {
  try {
    const session = await requireSession("write");

    const parsed = renameCategorySchema.safeParse({ name: String(form.get("name") ?? "") });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false, error: issue.message, field: String(issue.path[0]) };
    }

    await renameCategory(session.organizationId, id, parsed.data);
    revalidatePath(orgPath(session.organizationId, "/categories"));

    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function moveSubcategoryAction(id: string, newParentId: string): Promise<Result> {
  try {
    const session = await requireSession("write");
    await moveSubcategory(session.organizationId, id, newParentId);
    revalidatePath(orgPath(session.organizationId, "/categories"));
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}
