export type NaturezaConta = "PROPRIA" | "TERCEIRO";

export type ContaBancaria = {
  id: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  natureza: NaturezaConta;
  saldoInicial: number;
  dataSaldoInicial?: string;
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
];

export const contasBancarias: ContaBancaria[] = [
  {
    id: "1",
    nome: "Conta Principal",
    banco: "Banco do Brasil",
    agencia: "4567",
    conta: "12345-6",
    natureza: "PROPRIA",
    saldoInicial: 9854000,
    dataSaldoInicial: "2026-08-01",
    ativa: true,
  },
  {
    id: "2",
    nome: "Conta Operacional",
    banco: "ASAAS",
    agencia: "1234",
    conta: "56789",
    natureza: "PROPRIA",
    saldoInicial: 8542030,
    dataSaldoInicial: "2026-08-01",
    ativa: true,
  },
  {
    id: "3",
    nome: "Conta Reserva",
    banco: "Sicoob",
    agencia: "7890",
    conta: "34567-8",
    natureza: "PROPRIA",
    saldoInicial: 1500000,
    dataSaldoInicial: "2026-08-01",
    ativa: true,
  },
  {
    id: "4",
    nome: "Conta Fazenda Boa Esperança",
    banco: "Itaú",
    agencia: "3456",
    conta: "78901-2",
    natureza: "TERCEIRO",
    saldoInicial: 0,
    ativa: true,
  },
  {
    id: "5",
    nome: "Conta Investimentos",
    banco: "Bradesco",
    agencia: "2345",
    conta: "67890-3",
    natureza: "PROPRIA",
    saldoInicial: 4200000,
    dataSaldoInicial: "2026-08-01",
    ativa: true,
  },
  {
    id: "6",
    nome: "Conta Antiga",
    banco: "Caixa Econômica Federal",
    agencia: "1111",
    conta: "22222-3",
    natureza: "PROPRIA",
    saldoInicial: 0,
    ativa: false,
  },
];

export function getContaBancariaById(id: string) {
  return contasBancarias.find((conta) => conta.id === id);
}
