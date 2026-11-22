import { z } from "zod"

/**
 * O usuário escolhe quais recebimentos entram no repasse; o valor de cada um é
 * o que ainda resta dele, calculado pelo serviço. Conta de pagamento fica nula
 * até a conciliação e a categoria é resolvida pelo serviço — decisão do Rafael
 * de não perguntar nada disso na hora de gerar.
 *
 * Dois campos opcionais cobrem o repasse que não vai inteiro para o
 * favorecido (ex.: honorários que ele pediu para descontar):
 * - `amount` limita o repasse a menos que a soma dos recebimentos escolhidos;
 *   eles são consumidos do mais antigo para o mais novo e o último fica
 *   parcial — o que sobra dele continua disponível.
 * - `payeeId` paga outro contato por conta e ordem do favorecido: sai da cota
 *   dele, mas a conta a pagar e o extrato mostram quem recebeu de fato.
 */
export const generatePayoutInputSchema = z.object({
  beneficiaryId: z.string().min(1, "Selecione o favorecido."),
  dueDate: z.coerce.date("Informe o vencimento."),
  credits: z
    .array(z.object({ settlementId: z.string().min(1), allocationId: z.string().min(1) }))
    .min(1, "Selecione ao menos um recebimento."),
  amount: z.number().int().positive("Informe o valor do repasse.").optional(),
  payeeId: z.string().min(1).optional(),
  description: z.string().trim().max(200).optional(),
})

export type GeneratePayoutInput = z.infer<typeof generatePayoutInputSchema>
