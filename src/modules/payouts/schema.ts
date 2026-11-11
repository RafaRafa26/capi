import { z } from "zod"

/**
 * O usuário escolhe quais recebimentos entram no repasse; o valor de cada um é
 * o que ainda resta dele, calculado pelo serviço — nem valor entra aqui. Conta
 * de pagamento fica nula até a conciliação e a categoria é resolvida pelo
 * serviço — decisão do Rafael de não perguntar nada disso na hora de gerar.
 */
export const generatePayoutInputSchema = z.object({
  beneficiaryId: z.string().min(1, "Selecione o favorecido."),
  dueDate: z.coerce.date("Informe o vencimento."),
  credits: z
    .array(z.object({ settlementId: z.string().min(1), allocationId: z.string().min(1) }))
    .min(1, "Selecione ao menos um recebimento."),
})

export type GeneratePayoutInput = z.infer<typeof generatePayoutInputSchema>
