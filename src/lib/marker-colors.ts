// Paleta fixa dos marcadores (RN-36). O banco guarda só a chave, então mudar
// um tom aqui recolore todos os marcadores daquela cor de uma vez.
export const MARKER_COLORS = ["gray", "red", "orange", "amber", "green", "blue", "violet", "pink"] as const

export type MarkerColor = (typeof MARKER_COLORS)[number]

const hue: Record<MarkerColor, { dot: string; text: string; background: string }> = {
  gray: { dot: "oklch(0.6 0.02 260)", text: "oklch(0.45 0.02 260)", background: "oklch(0.6 0.02 260 / 14%)" },
  red: { dot: "oklch(0.63 0.22 25)", text: "oklch(0.55 0.22 25)", background: "oklch(0.63 0.24 25 / 14%)" },
  orange: { dot: "oklch(0.7 0.18 50)", text: "oklch(0.55 0.16 45)", background: "oklch(0.7 0.18 50 / 16%)" },
  amber: { dot: "oklch(0.78 0.16 80)", text: "oklch(0.52 0.12 70)", background: "oklch(0.78 0.16 80 / 22%)" },
  green: { dot: "oklch(0.68 0.17 149)", text: "oklch(0.5 0.15 149)", background: "oklch(0.72 0.19 149 / 15%)" },
  blue: { dot: "oklch(0.62 0.17 250)", text: "oklch(0.5 0.17 255)", background: "oklch(0.62 0.17 250 / 14%)" },
  violet: { dot: "oklch(0.6 0.2 295)", text: "oklch(0.5 0.2 295)", background: "oklch(0.6 0.2 295 / 14%)" },
  pink: { dot: "oklch(0.65 0.21 350)", text: "oklch(0.55 0.2 350)", background: "oklch(0.65 0.21 350 / 14%)" },
}

export const markerColorLabel: Record<MarkerColor, string> = {
  gray: "Cinza",
  red: "Vermelho",
  orange: "Laranja",
  amber: "Amarelo",
  green: "Verde",
  blue: "Azul",
  violet: "Roxo",
  pink: "Rosa",
}

function resolve(color: string): MarkerColor {
  return (MARKER_COLORS as readonly string[]).includes(color) ? (color as MarkerColor) : "gray"
}

export function markerDotColor(color: string): string {
  return hue[resolve(color)].dot
}

export function markerBadgeStyle(color: string): { backgroundColor: string; color: string } {
  const { background, text } = hue[resolve(color)]
  return { backgroundColor: background, color: text }
}

// Hex para o PDF do relatório — o react-pdf não entende oklch. Texto escuro
// sobre fundo bem claro, legível também impresso em preto e branco.
const print: Record<MarkerColor, { text: string; background: string }> = {
  gray: { text: "#374151", background: "#f3f4f6" },
  red: { text: "#b91c1c", background: "#fee2e2" },
  orange: { text: "#c2410c", background: "#ffedd5" },
  amber: { text: "#a16207", background: "#fef3c7" },
  green: { text: "#15803d", background: "#dcfce7" },
  blue: { text: "#1d4ed8", background: "#dbeafe" },
  violet: { text: "#6d28d9", background: "#ede9fe" },
  pink: { text: "#be185d", background: "#fce7f3" },
}

export function markerPrintColor(color: string): { text: string; background: string } {
  return print[resolve(color)]
}
