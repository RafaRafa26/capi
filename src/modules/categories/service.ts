import "server-only";

import { withOrganization, type Tx } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import type { CategoryInput, QuickCategoryInput, RenameCategoryInput } from "./schema";
import type { Category } from "./types";

const FIELDS = { id: true, name: true, type: true, parentId: true } as const;

async function rejectDuplicateName(
  tx: Tx,
  parentId: string | null,
  name: string,
  excludingId?: string,
) {
  const existing = await tx.category.findFirst({
    where: { parentId, name, ...(excludingId ? { id: { not: excludingId } } : {}) },
  });
  if (existing) {
    // On screen a top-level category is a "grupo" and a subcategory is a
    // "categoria" — the model keeps the parent/child naming.
    throw new BusinessError(
      parentId ? "Já existe uma categoria com esse nome nesse grupo." : "Já existe um grupo com esse nome.",
      "name",
    );
  }
}

export async function listCategories(organizationId: string): Promise<Category[]> {
  return withOrganization(organizationId, (tx) =>
    tx.category.findMany({ select: FIELDS, orderBy: { name: "asc" } }),
  );
}

export async function createCategory(
  organizationId: string,
  input: CategoryInput,
): Promise<Category> {
  return withOrganization(organizationId, async (tx) => {
    let type = input.type;

    if (input.parentId) {
      const parent = await tx.category.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFound("Grupo");
      if (parent.parentId) throw new BusinessError("Uma categoria não pode ter categorias dentro dela.");
      type = parent.type;
    }

    if (!type) throw new BusinessError("Informe o tipo.", "type");

    await rejectDuplicateName(tx, input.parentId ?? null, input.name);

    return tx.category.create({
      data: { organizationId, name: input.name, type, parentId: input.parentId ?? null },
      select: FIELDS,
    });
  });
}

/**
 * Quick-add from the Registrar sheet and the reconciliation pickers: a
 * category inside an existing group, or inside a new group created in the
 * same transaction — so an organization with no groups yet can still
 * register its first entry without leaving the form.
 */
export async function createQuickCategory(
  organizationId: string,
  input: QuickCategoryInput,
): Promise<{ category: Category; group: Category | null }> {
  return withOrganization(organizationId, async (tx) => {
    let parentId = input.groupId ?? null;
    let group: Category | null = null;

    if (parentId) {
      const parent = await tx.category.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFound("Grupo");
      if (parent.parentId) throw new BusinessError("Escolha um grupo.", "groupId");
      if (parent.type !== input.type) {
        throw new BusinessError("O grupo é de outro tipo.", "groupId");
      }
    } else {
      const groupName = input.groupName ?? "";
      const existing = await tx.category.findFirst({ where: { parentId: null, name: groupName } });
      if (existing) throw new BusinessError("Já existe um grupo com esse nome.", "groupName");
      group = await tx.category.create({
        data: { organizationId, name: groupName, type: input.type, parentId: null },
        select: FIELDS,
      });
      parentId = group.id;
    }

    await rejectDuplicateName(tx, parentId, input.name);

    const category = await tx.category.create({
      data: { organizationId, name: input.name, type: input.type, parentId },
      select: FIELDS,
    });
    return { category, group };
  });
}

export async function renameCategory(
  organizationId: string,
  id: string,
  input: RenameCategoryInput,
): Promise<Category> {
  return withOrganization(organizationId, async (tx) => {
    const current = await tx.category.findUnique({ where: { id } });
    if (!current) throw new NotFound("Categoria");

    await rejectDuplicateName(tx, current.parentId, input.name, id);

    return tx.category.update({ where: { id }, data: { name: input.name }, select: FIELDS });
  });
}

/** Reparents a subcategory under a different top-level category (drag and drop). */
export async function moveSubcategory(
  organizationId: string,
  id: string,
  newParentId: string,
): Promise<Category> {
  return withOrganization(organizationId, async (tx) => {
    const subcategory = await tx.category.findUnique({ where: { id } });
    if (!subcategory) throw new NotFound("Categoria");
    if (!subcategory.parentId) throw new BusinessError("Só é possível mover categorias, não grupos.");
    if (subcategory.parentId === newParentId) return subcategory;

    const newParent = await tx.category.findUnique({ where: { id: newParentId } });
    if (!newParent) throw new NotFound("Grupo de destino");
    if (newParent.parentId) {
      throw new BusinessError("O destino precisa ser um grupo.");
    }
    if (newParent.type !== subcategory.type) {
      throw new BusinessError("Só é possível mover entre grupos do mesmo tipo.");
    }

    await rejectDuplicateName(tx, newParentId, subcategory.name, id);

    return tx.category.update({
      where: { id },
      data: { parentId: newParentId },
      select: FIELDS,
    });
  });
}
