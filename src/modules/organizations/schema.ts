import { z } from "zod";

import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/document";

export const organizationInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da empresa."),
  document: z
    .string()
    .trim()
    .min(1, "Informe o CNPJ ou CPF.")
    .refine((value) => isValidCnpj(value) || isValidCpf(value), "CNPJ ou CPF inválido.")
    .transform(onlyDigits),
});

export type OrganizationInput = z.infer<typeof organizationInputSchema>;
