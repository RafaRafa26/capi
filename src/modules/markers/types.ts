import type { MarkerColor } from "@/lib/marker-colors"

// Os dois lados que têm marcadores — transferência não tem acompanhamento.
export type MarkerType = "RECEIVABLE" | "PAYABLE"

export interface Marker {
  id: string
  type: MarkerType
  name: string
  color: MarkerColor
}
