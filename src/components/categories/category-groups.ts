import type { SearchableSelectGroup } from "@/components/sales/searchable-select"
import type { Category } from "@/modules/categories/types"

/** One section per top-level category, listing its subcategories — or the
 * category itself, for one with no subcategories yet. */
export function buildCategoryGroups(categories: Category[]): SearchableSelectGroup[] {
  const topLevel = categories.filter((category) => !category.parentId)
  return topLevel.map((top) => {
    const subcategories = categories.filter((category) => category.parentId === top.id)
    return {
      label: top.name,
      options:
        subcategories.length > 0
          ? subcategories.map((sub) => ({ value: sub.id, label: sub.name }))
          : [{ value: top.id, label: top.name }],
    }
  })
}
