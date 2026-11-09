// Hex copies of the palette for react-pdf, which reads neither CSS variables
// nor oklch. Keep in sync with the `--color-capi-*` tokens in globals.css;
// this is the only place outside globals.css that spells out a color.

export const capiHex = {
  purpleDark: "#300766",
  red: "#dc2626",
  white: "#ffffff",
  black: "#0a0a0a",
} as const

// Neutral grays for the report body, which has no brand counterpart.
export const printNeutral = {
  soft: "#4b5563",
  line: "#d1d5db",
  zebra: "#f6f7f9",
} as const

// Marker badges on paper: dark text on a very light fill, still legible when
// printed in black and white.
export const markerPrintHex = {
  gray: { text: "#374151", background: "#f3f4f6" },
  red: { text: "#b91c1c", background: "#fee2e2" },
  orange: { text: "#c2410c", background: "#ffedd5" },
  amber: { text: "#a16207", background: "#fef3c7" },
  green: { text: "#15803d", background: "#dcfce7" },
  blue: { text: "#1d4ed8", background: "#dbeafe" },
  violet: { text: "#6d28d9", background: "#ede9fe" },
  pink: { text: "#be185d", background: "#fce7f3" },
} as const
