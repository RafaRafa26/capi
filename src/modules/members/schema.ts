import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "OPERATOR", "VIEWER"], "Escolha um papel.");

export const invitationInputSchema = z.object({
  email: z.email("Informe um e-mail válido.").transform((email) => email.trim().toLowerCase()),
  role: roleSchema,
});

export type InvitationInput = z.infer<typeof invitationInputSchema>;
