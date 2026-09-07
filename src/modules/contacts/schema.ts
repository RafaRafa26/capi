import { z } from "zod"

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  document: z.string().trim().min(1, "Informe o documento."),
  personType: z.enum(["INDIVIDUAL", "COMPANY"]),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
})

export type ContactInput = z.infer<typeof contactInputSchema>
