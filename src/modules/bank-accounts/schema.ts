import { z } from "zod"

export const bankAccountInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  bank: z.string().trim().min(1, "Informe o banco."),
  branchNumber: z.string().trim().min(1, "Informe a agência."),
  accountNumber: z.string().trim().min(1, "Informe a conta."),
  kind: z.enum(["CHECKING", "SAVINGS_POCKET"]),
  holderType: z.enum(["INDIVIDUAL", "COMPANY"]),
  controlStartDate: z.coerce.date("Informe a data de início do controle."),
  initialBalance: z.number().int("O saldo deve ser um valor em centavos."),
})

export type BankAccountInput = z.infer<typeof bankAccountInputSchema>
