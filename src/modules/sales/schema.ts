import { z } from "zod"

const beneficiarySchema = z.object({
  beneficiaryId: z.string().min(1, "Selecione o favorecido."),
  value: z.number(),
})

const installmentSchema = z.object({
  installmentNumber: z.number().int().min(1),
  dueDate: z.coerce.date(),
  amount: z.number().int().positive(),
})

export const saleInputSchema = z
  .object({
    contactId: z.string().min(1, "Selecione o cliente."),
    categoryId: z.string().min(1, "Selecione a categoria."),
    bankAccountId: z.string().min(1, "Selecione a conta de recebimento."),
    description: z.string().trim().min(1, "Informe a descrição."),
    totalAmount: z.number().int().positive("Informe o valor da venda."),
    paymentMethod: z.enum(["BOLETO", "PIX", "CREDIT_CARD", "BANK_TRANSFER"], "Selecione a forma de pagamento."),
    billingType: z.enum(["INSTALLMENTS", "RECURRING"]),
    installmentsCount: z.number().int().min(1, "Informe ao menos 1 parcela."),
    billingFrequency: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "YEARLY"]),
    firstDueDate: z.coerce.date("Informe o vencimento."),
    // RECURRING only: null means indeterminado.
    recurrenceEndDate: z.coerce.date().nullable().optional(),
    // The client generates a default set (domain.generateInstallments) and
    // lets the user edit individual due dates/amounts before saving (RN-17)
    // — this is what actually gets persisted, not a server-side regeneration.
    installments: z.array(installmentSchema).min(1, "Informe ao menos uma parcela."),
    allocationMode: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).optional(),
    allocations: z.array(beneficiarySchema).default([]),
  })
  .refine((data) => data.allocations.length === 0 || data.allocationMode, {
    message: "Selecione o modo de repasse.",
    path: ["allocationMode"],
  })

export type SaleInput = z.infer<typeof saleInputSchema>
