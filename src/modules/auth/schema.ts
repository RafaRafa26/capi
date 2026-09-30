import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome."),
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
