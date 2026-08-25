// Tipos e constantes compartilhados entre servidor e cliente.
//
// Ficam FORA de servico.ts de propósito: aquele arquivo importa o driver do
// Postgres, e um componente de cliente que importasse um valor de lá arrastaria
// o driver inteiro para o bundle do navegador.

export type NaturezaConta = "PROPRIA" | "TERCEIRO";

export type ContaBancaria = {
  id: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  natureza: NaturezaConta;
  saldoInicial: number;
  dataSaldoInicial: string | null;
  ativa: boolean;
};

export const BANCOS = [
  "Banco do Brasil",
  "ASAAS",
  "Sicoob",
  "Itaú",
  "Bradesco",
  "Caixa Econômica Federal",
  "Santander",
  "Nubank",
] as const;
