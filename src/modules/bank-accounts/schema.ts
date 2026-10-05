import { z } from "zod"

export const bankAccountInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  bank: z.string().trim().min(1, "Informe o banco."),
  // Opcionais — sem agência ou número, a coluna guarda "".
  branchNumber: z.string().trim(),
  accountNumber: z.string().trim(),
  kind: z.enum(["CHECKING", "SAVINGS_POCKET"]),
  holderType: z.enum(["INDIVIDUAL", "COMPANY"]),
  controlStartDate: z.coerce.date("Informe a data de início do controle."),
  initialBalance: z.number().int("O saldo deve ser um valor em centavos."),
})

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>
