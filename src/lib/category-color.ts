// Deterministic color per category — fixed across sessions since it's
// derived from the category's own id, not stored anywhere. Used for the
// colored dot next to a category's name (accounts table + detail Sheet).
const CATEGORY_COLOR_PALETTE = Array.from({ length: 10 }, (_, i) => `var(--category-${i + 1})`)

export function categoryColor(categoryId: string): string {
  let hash = 0
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % CATEGORY_COLOR_PALETTE.length
  return CATEGORY_COLOR_PALETTE[index]
}
