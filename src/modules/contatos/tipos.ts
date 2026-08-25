import type { ContatoModel } from "@/db/generated/models";
import type { PapelContato, TipoPessoa } from "@/db/generated/enums";

export type { PapelContato, TipoPessoa };

/**
 * O contato como as telas o consomem. `Date` não atravessa a fronteira
 * servidor→cliente sem custo, e a UI não usa `criadoEm`, então ele fica fora.
 */
export type Contato = Omit<ContatoModel, "organizacaoId" | "criadoEm">;

export const papelLabel: Record<PapelContato, string> = {
  PAGADOR: "Pagador",
  FAVORECIDO: "Favorecido",
  FORNECEDOR: "Fornecedor",
};

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
