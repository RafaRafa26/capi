import { z } from "zod"

const bankDetailsSchema = z.object({
  pixKey: z.string().trim().min(1, "Informe a chave PIX."),
  bank: z.string().trim().min(1, "Informe o banco."),
  branchNumber: z.string().trim().min(1, "Informe a agência."),
  accountNumber: z.string().trim().min(1, "Informe a conta."),
  accountType: z.string().trim().min(1, "Informe o tipo de conta."),
  accountHolder: z.string().trim().min(1, "Informe o titular."),
})

export const contactInputSchema = z
  .object({
    name: z.string().trim().min(1, "Informe o nome."),
    legalName: z.string().trim().optional().or(z.literal("")),
    document: z.string().trim().min(1, "Informe o documento."),
    personType: z.enum(["INDIVIDUAL", "COMPANY"]),
    contactType: z.enum(["CLIENT", "SUPPLIER", "BENEFICIARY", "EMPLOYEE", "PARTNER"]),
    phone: z.string().trim().optional().or(z.literal("")),
    email: z.email("Informe um e-mail válido.").optional().or(z.literal("")),
    city: z.string().trim().optional().or(z.literal("")),
    state: z.string().trim().optional().or(z.literal("")),
    bankDetails: bankDetailsSchema.partial().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.personType === "COMPANY" && !data.legalName) {
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Informe a razão social.",
      });
    }

    if (data.contactType === "BENEFICIARY") {
      const result = bankDetailsSchema.safeParse(data.bankDetails ?? {});
      if (!result.success) {
        ctx.addIssue({
          code: "custom",
          path: ["bankDetails"],
          message: "Favorecidos precisam de dados bancários completos.",
        });
      }
    }
  })

export type ContactInput = z.infer<typeof contactInputSchema>

// Quick-add from the new-sale screen: only the name, so the user never has
// to leave the sale form to register a client. `document` stays unset until
// someone completes the contact later on the Contacts screen.
export const quickClientSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome."),
})

export type QuickClientInput = z.infer<typeof quickClientSchema>
