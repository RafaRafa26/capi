import "server-only";

import { withOrganization, type Tx } from "@/db/client";
import { BusinessError, NotFound } from "@/shared/errors";
import type { CategoryInput, RenameCategoryInput } from "./schema";
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
    throw new BusinessError("Já existe uma categoria com esse nome nesse nível.", "name");
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
      if (!parent) throw new NotFound("Categoria");
      if (parent.parentId) throw new BusinessError("Uma subcategoria não pode ter subcategorias.");
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
    if (!subcategory.parentId) throw new BusinessError("Só é possível mover subcategorias.");
    if (subcategory.parentId === newParentId) return subcategory;

    const newParent = await tx.category.findUnique({ where: { id: newParentId } });
    if (!newParent) throw new NotFound("Categoria de destino");
    if (newParent.parentId) {
      throw new BusinessError("O destino precisa ser uma categoria de nível superior.");
    }
    if (newParent.type !== subcategory.type) {
      throw new BusinessError("Só é possível mover entre categorias do mesmo tipo.");
    }

    await rejectDuplicateName(tx, newParentId, subcategory.name, id);

    return tx.category.update({
      where: { id },
      data: { parentId: newParentId },
      select: FIELDS,
    });
  });
}
