import { z } from "zod"

/**
 * O repasse é sempre do saldo disponível inteiro, então nem valor entra aqui:
 * o serviço calcula. Conta de pagamento fica nula até a conciliação e a
 * categoria é resolvida pelo serviço — decisão do Rafael de não perguntar nada
 * disso na hora de gerar.
 */
export const generatePayoutInputSchema = z.object({
  beneficiaryId: z.string().min(1, "Selecione o favorecido."),
  dueDate: z.coerce.date("Informe o vencimento."),
})

export type GeneratePayoutInput = z.infer<typeof generatePayoutInputSchema>
