import { z } from "zod";

// Validação de fronteira (ARQUITETURA §8.3.6). Tudo que chega de formulário
// passa por aqui antes de virar chamada de serviço.

const textoOpcional = z
  .string()
  .trim()
  .max(200, "Texto longo demais.")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** Conta só os dígitos: aceita com ou sem máscara. */
const digitos = (v: string) => v.replace(/\D/g, "");

export const contatoEsquema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome."),
    tipoPessoa: z.enum(["FISICA", "JURIDICA"]),
    documento: z.string().trim().min(1, "Informe o documento."),
    papeis: z
      .array(z.enum(["PAGADOR", "FAVORECIDO", "FORNECEDOR"]))
      .min(1, "Selecione ao menos um papel."),
    telefone: textoOpcional,
    email: z
      .union([z.literal(""), z.email("E-mail inválido.")])
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    cidade: textoOpcional,
    estado: textoOpcional,
    banco: textoOpcional,
    tipoConta: textoOpcional,
    agencia: textoOpcional,
    conta: textoOpcional,
    tipoChavePix: textoOpcional,
    chavePix: textoOpcional,
    ativo: z.boolean().default(true),
  })
  .superRefine((dados, ctx) => {
    const n = digitos(dados.documento).length;
    const esperado = dados.tipoPessoa === "FISICA" ? 11 : 14;
    if (n !== esperado) {
      ctx.addIssue({
        code: "custom",
        path: ["documento"],
        message:
          dados.tipoPessoa === "FISICA"
            ? "CPF deve ter 11 dígitos."
            : "CNPJ deve ter 14 dígitos.",
      });
    }
  });

export type ContatoEntrada = z.infer<typeof contatoEsquema>;

/** Traduz FormData do formulário de contato para o formato do esquema. */
export function contatoDoFormulario(form: FormData) {
  return {
    nome: String(form.get("nome") ?? ""),
    tipoPessoa: String(form.get("tipoPessoa") ?? "FISICA"),
    documento: String(form.get("documento") ?? ""),
    papeis: form.getAll("papeis").map(String),
    telefone: String(form.get("telefone") ?? ""),
    email: String(form.get("email") ?? ""),
    cidade: String(form.get("cidade") ?? ""),
    estado: String(form.get("estado") ?? ""),
    banco: String(form.get("banco") ?? ""),
    tipoConta: String(form.get("tipoConta") ?? ""),
    agencia: String(form.get("agencia") ?? ""),
    conta: String(form.get("conta") ?? ""),
    tipoChavePix: String(form.get("tipoChavePix") ?? ""),
    chavePix: String(form.get("chavePix") ?? ""),
    ativo: form.get("ativo") !== "false",
  };
}

/** Primeira mensagem de erro do Zod, no formato que a borda devolve. */
export function primeiroErro(erro: z.ZodError) {
  const issue = erro.issues[0];
  return { mensagem: issue.message, campo: String(issue.path[0] ?? "") };
}
