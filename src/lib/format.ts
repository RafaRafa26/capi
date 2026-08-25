const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const currencyFormatterNoDecimals = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: number) {
  return currencyFormatter.format(cents / 100);
}

// Sem centavos, para rótulos de eixo/escala (ex.: "R$ 100.000").
export function formatMoneyAxis(cents: number) {
  return currencyFormatterNoDecimals.format(cents / 100);
}
