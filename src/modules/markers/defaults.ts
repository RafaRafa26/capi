import type { MarkerColor } from "@/lib/marker-colors"
import type { MarkerType } from "./types"

/**
 * Marcadores com que toda organização nasce (RN-36). As que já existiam
 * receberam os mesmos pela migração 20261001235937_default_markers — mantenha
 * as duas listas iguais.
 */
export const DEFAULT_MARKERS: { type: MarkerType; name: string; color: MarkerColor }[] = [
  { type: "RECEIVABLE", name: "Cobrado, sem retorno", color: "orange" },
  { type: "RECEIVABLE", name: "Não atende / não responde", color: "red" },
  { type: "RECEIVABLE", name: "Pagamento combinado", color: "blue" },
  { type: "RECEIVABLE", name: "Em negociação", color: "violet" },
  { type: "RECEIVABLE", name: "Contestado", color: "gray" },
  { type: "PAYABLE", name: "Aguardando nota fiscal", color: "amber" },
  { type: "PAYABLE", name: "Agendado", color: "blue" },
  { type: "PAYABLE", name: "Em negociação", color: "violet" },
  { type: "PAYABLE", name: "Contestado", color: "gray" },
]
