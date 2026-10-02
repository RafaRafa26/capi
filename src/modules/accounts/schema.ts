import { z } from "zod"

export const updateAccountEntrySchema = z.object({
  contactId: z.string().min(1, "Selecione o contato."),
  categoryId: z.string().min(1, "Selecione a categoria."),
  // Opcional porque o repasse nasce sem conta (schema.prisma#Entry) e precisa
  // poder ser salvo do mesmo jeito pelo Sheet de detalhe.
  bankAccountId: z.string().nullable(),
  description: z.string().trim().min(1, "Informe a descrição."),
  paymentMethod: z.enum(["BOLETO", "PIX", "CREDIT_CARD", "BANK_TRANSFER"], "Selecione a forma de pagamento."),
  // Only applied while the entry is still FORECAST (RN-17) — service.ts
  // silently ignores these two once it's PARTIAL/SETTLED, since changing
  // them after money has moved would drift from what was actually settled.
  dueDate: z.coerce.date("Informe o vencimento."),
  amount: z.number().int().positive("Informe o valor."),
})

export type UpdateAccountEntryInput = z.infer<typeof updateAccountEntrySchema>

export const updateEntryNotesSchema = z.object({
  markerId: z.string().min(1).nullable(),
  // Vazia vira null — "sem observação" tem um jeito só de ser guardado.
  notes: z
    .string()
    .trim()
    .max(2000, "Use no máximo 2000 caracteres.")
    .nullable()
    .transform((value) => value || null),
})

export type UpdateEntryNotesInput = z.infer<typeof updateEntryNotesSchema>
