import { z } from "zod"

import { MARKER_COLORS } from "@/lib/marker-colors"

export const markerInputSchema = z.object({
  type: z.enum(["RECEIVABLE", "PAYABLE"], "Informe o tipo."),
  name: z.string().trim().min(1, "Informe o nome.").max(60, "Use no máximo 60 caracteres."),
  color: z.enum(MARKER_COLORS, "Escolha uma cor."),
})

export type MarkerInput = z.infer<typeof markerInputSchema>

// O tipo não muda depois de criado: os lançamentos marcados são todos daquele lado.
export const updateMarkerSchema = markerInputSchema.omit({ type: true })

export type UpdateMarkerInput = z.infer<typeof updateMarkerSchema>
