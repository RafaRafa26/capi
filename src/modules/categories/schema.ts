import { z } from "zod"

export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome."),
    // Required for a top-level category. A subcategory inherits its type
    // from `parentId` and this is ignored when `parentId` is set.
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    parentId: z.string().optional(),
  })
  .refine((data) => data.parentId || data.type, {
    message: "Informe o tipo.",
    path: ["type"],
  })

export type CategoryInput = z.infer<typeof categoryInputSchema>

export const renameCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
})

export type RenameCategoryInput = z.infer<typeof renameCategorySchema>

// Quick-add (Registrar sheet, reconciliation): a categoria inside an existing
// grupo (`groupId`) or inside a new one created with it (`groupName`).
export const quickCategorySchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome da categoria."),
    type: z.enum(["INCOME", "EXPENSE"]),
    groupId: z.string().optional(),
    groupName: z.string().trim().optional(),
  })
  .refine((data) => data.groupId || data.groupName, {
    message: "Escolha um grupo ou dê nome a um novo.",
    path: ["groupName"],
  })

export type QuickCategoryInput = z.infer<typeof quickCategorySchema>
