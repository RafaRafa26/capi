// Deterministic color per category — fixed across sessions since it's
// derived from the category's own id, not stored anywhere. Used for the
// colored dot next to a category's name (accounts table + detail Sheet).
const CATEGORY_COLOR_PALETTE = [
  "oklch(0.65 0.19 25)",
  "oklch(0.65 0.17 60)",
  "oklch(0.7 0.16 95)",
  "oklch(0.65 0.16 145)",
  "oklch(0.65 0.14 185)",
  "oklch(0.6 0.15 230)",
  "oklch(0.6 0.18 265)",
  "oklch(0.62 0.2 300)",
  "oklch(0.62 0.22 330)",
  "oklch(0.6 0.02 30)",
]

export function categoryColor(categoryId: string): string {
  let hash = 0
  for (let i = 0; i < categoryId.length; i += 1) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) | 0
  }
  const index = Math.abs(hash) % CATEGORY_COLOR_PALETTE.length
  return CATEGORY_COLOR_PALETTE[index]
}
