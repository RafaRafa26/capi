import { z } from "zod"

const optionalText = z.string().trim().optional().or(z.literal(""))

// Só o nome é obrigatório: documento, razão social e dados bancários podem
// ficar para depois — o repasse avisa quando faltam dados do favorecido.
const bankDetailsSchema = z.object({
  pixKey: optionalText,
  bank: optionalText,
  branchNumber: optionalText,
  accountNumber: optionalText,
  accountType: optionalText,
  accountHolder: optionalText,
})

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  legalName: optionalText,
  document: optionalText,
  personType: z.enum(["INDIVIDUAL", "COMPANY"]),
  contactType: z.enum(["CLIENT", "SUPPLIER", "BENEFICIARY", "EMPLOYEE", "PARTNER"]),
  phone: optionalText,
  email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
  city: optionalText,
  state: optionalText,
  bankDetails: bankDetailsSchema.optional(),
})

export type ContactInput = z.infer<typeof contactInputSchema>

// Quick-add from the new-sale/new-expense screens: only name and type, so
// the user never has to leave the form to register a contact. `document`
// stays unset until someone completes the contact later on the Contacts
// screen.
export const quickContactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
  contactType: z.enum(["CLIENT", "SUPPLIER", "BENEFICIARY", "EMPLOYEE", "PARTNER"]),
})

export type QuickContactInput = z.infer<typeof quickContactSchema>
