import { z } from "zod"

export const importStatementInputSchema = z.object({
  bankAccountId: z.string().min(1, "Selecione a conta bancária."),
  fileName: z.string().min(1),
  content: z.string().min(1, "Arquivo vazio."),
})

export type ImportStatementInput = z.infer<typeof importStatementInputSchema>
