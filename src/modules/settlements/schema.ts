import { z } from "zod"

export const searchCandidateEntriesInputSchema = z.object({
  type: z.enum(["RECEIVABLE", "PAYABLE"]),
  query: z.string().trim().optional(),
})
export type SearchCandidateEntriesInput = z.infer<typeof searchCandidateEntriesInputSchema>

// Optional rather than `.default()` — the service already treats a missing
// adjustment as 0 (see settlements/service.ts#insertSettlement), so the
// inferred type here stays optional too instead of forcing every caller
// (including tests) to spell out three zeros.
const settlementAdjustments = {
  interest: z.number().int().min(0).optional(),
  fine: z.number().int().min(0).optional(),
  discount: z.number().int().min(0).optional(),
}

export const createSettlementInputSchema = z.object({
  entryId: z.string().min(1),
  bankTransactionId: z.string().min(1),
  settledAmount: z.number().int().positive("Informe o valor liquidado."),
  ...settlementAdjustments,
  settledAt: z.coerce.date(),
})
export type CreateSettlementInput = z.infer<typeof createSettlementInputSchema>

const settlementBatchItemSchema = z.object({
  entryId: z.string().min(1),
  settledAmount: z.number().int().positive("Informe o valor liquidado."),
  ...settlementAdjustments,
  settledAt: z.coerce.date(),
})
export type SettlementBatchItem = z.infer<typeof settlementBatchItemSchema>

export const createSettlementBatchInputSchema = z.object({
  bankTransactionId: z.string().min(1),
  items: z.array(settlementBatchItemSchema).min(1, "Selecione ao menos um lançamento."),
})
export type CreateSettlementBatchInput = z.infer<typeof createSettlementBatchInputSchema>

export const manualSettleInputSchema = z.object({
  entryId: z.string().min(1),
  settledAt: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
})
export type ManualSettleInput = z.infer<typeof manualSettleInputSchema>

// Shape is identical for a receivable quick-create (see
// settlements/service.ts#createAndSettleReceivable) — only which category
// type is accepted differs, validated service-side.
export const createAndSettlePayableInputSchema = z.object({
  contactId: z.string().min(1, "Selecione o contato."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  bankAccountId: z.string().min(1, "Selecione a conta."),
  description: z.string().trim().min(1, "Informe a descrição."),
  bankTransactionId: z.string().min(1),
  settledAmount: z.number().int().positive("Informe o valor."),
  settledAt: z.coerce.date(),
})
export type CreateAndSettlePayableInput = z.infer<typeof createAndSettlePayableInputSchema>
