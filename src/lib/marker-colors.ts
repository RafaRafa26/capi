import { markerPrintHex } from "@/lib/print-palette"

// Paleta fixa dos marcadores (RN-36). O banco guarda só a chave, então mudar
// um tom em globals.css recolore todos os marcadores daquela cor de uma vez.
export const MARKER_COLORS = ["gray", "red", "orange", "amber", "green", "blue", "violet", "pink"] as const

export type MarkerColor = (typeof MARKER_COLORS)[number]

// Tons definidos em globals.css (--marker-*); o fundo do selo é o próprio tom
// diluído, então cada cor só precisa de dois tokens.
const hue = (color: MarkerColor) => ({
  dot: `var(--marker-${color})`,
  text: `var(--marker-${color}-text)`,
  background: `color-mix(in oklch, var(--marker-${color}) 14%, transparent)`,
})

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
  return hue(resolve(color)).dot
}

export function markerBadgeStyle(color: string): { backgroundColor: string; color: string } {
  const { background, text } = hue(resolve(color))
  return { backgroundColor: background, color: text }
}

export function markerPrintColor(color: string): { text: string; background: string } {
  return markerPrintHex[resolve(color)]
}
