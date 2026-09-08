import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestOrganization, removeTestOrganizations, type TestOrg } from "@/db/__tests__/environment";
import { BusinessError, NotFound } from "@/shared/errors";
import { createCategory, moveSubcategory, renameCategory } from "./service";

let org: TestOrg;

beforeAll(async () => {
  org = await createTestOrganization("Categories");
});

afterAll(async () => {
  await removeTestOrganizations([org.id]);
});

describe("categories", () => {
  it("creates a top-level category with an explicit type", async () => {
    const category = await createCategory(org.id, { name: "Vendas", type: "INCOME" });
    expect(category.type).toBe("INCOME");
    expect(category.parentId).toBeNull();
  });

  it("requires a type for a top-level category", async () => {
    await expect(createCategory(org.id, { name: "Sem tipo" })).rejects.toThrow(BusinessError);
  });

  it("a subcategory inherits its parent's type", async () => {
    const parent = await createCategory(org.id, { name: "Vendas de gado", type: "INCOME" });
    const child = await createCategory(org.id, { name: "Boi gordo", parentId: parent.id });
    expect(child.type).toBe("INCOME");
    expect(child.parentId).toBe(parent.id);
  });

  it("rejects a duplicate name under the same parent", async () => {
    const parent = await createCategory(org.id, { name: "Despesas fixas", type: "EXPENSE" });
    await createCategory(org.id, { name: "Aluguel", parentId: parent.id });
    await expect(
      createCategory(org.id, { name: "Aluguel", parentId: parent.id }),
    ).rejects.toThrow(BusinessError);
  });

  it("allows the same subcategory name under a different parent", async () => {
    const parentA = await createCategory(org.id, { name: "Categoria A", type: "EXPENSE" });
    const parentB = await createCategory(org.id, { name: "Categoria B", type: "EXPENSE" });
    await createCategory(org.id, { name: "Combustível", parentId: parentA.id });
    const inB = await createCategory(org.id, { name: "Combustível", parentId: parentB.id });
    expect(inB.parentId).toBe(parentB.id);
  });

  it("renames a category", async () => {
    const category = await createCategory(org.id, { name: "Nome antigo", type: "INCOME" });
    const renamed = await renameCategory(org.id, category.id, { name: "Nome novo" });
    expect(renamed.name).toBe("Nome novo");
  });

  it("renaming a nonexistent category fails", async () => {
    await expect(
      renameCategory(org.id, "00000000-0000-0000-0000-000000000000", { name: "x" }),
    ).rejects.toThrow(NotFound);
  });

  it("moves a subcategory between parents of the same type", async () => {
    const parentA = await createCategory(org.id, { name: "Origem", type: "INCOME" });
    const parentB = await createCategory(org.id, { name: "Destino", type: "INCOME" });
    const child = await createCategory(org.id, { name: "Item móvel", parentId: parentA.id });

    const moved = await moveSubcategory(org.id, child.id, parentB.id);
    expect(moved.parentId).toBe(parentB.id);
  });

  it("refuses to move a subcategory to a parent of a different type", async () => {
    const income = await createCategory(org.id, { name: "Receita X", type: "INCOME" });
    const expense = await createCategory(org.id, { name: "Despesa X", type: "EXPENSE" });
    const child = await createCategory(org.id, { name: "Sub X", parentId: income.id });

    await expect(moveSubcategory(org.id, child.id, expense.id)).rejects.toThrow(BusinessError);
  });

  it("refuses to move a top-level category (only subcategories move)", async () => {
    const a = await createCategory(org.id, { name: "Nível A", type: "INCOME" });
    const b = await createCategory(org.id, { name: "Nível B", type: "INCOME" });
    await expect(moveSubcategory(org.id, a.id, b.id)).rejects.toThrow(BusinessError);
  });
});
