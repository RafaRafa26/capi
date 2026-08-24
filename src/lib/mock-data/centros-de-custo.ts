export type CentroCusto = {
  id: string;
  nome: string;
  ativo: boolean;
};

export const centrosDeCusto: CentroCusto[] = [
  { id: "1", nome: "Fazenda Boa Esperança", ativo: true },
  { id: "2", nome: "Fazenda Santa Rita", ativo: true },
  { id: "3", nome: "Agropecuária Bom Retiro", ativo: true },
  { id: "4", nome: "Unidade de Beneficiamento", ativo: true },
  { id: "5", nome: "Escritório Central", ativo: true },
  { id: "6", nome: "Transporte e Logística", ativo: true },
  { id: "7", nome: "Armazém Grãos — Uberlândia", ativo: true },
  { id: "8", nome: "Laticínio Serra Verde", ativo: true },
  { id: "9", nome: "Confinamento Nelore", ativo: false },
  { id: "10", nome: "Projeto Irrigação Norte", ativo: false },
];
