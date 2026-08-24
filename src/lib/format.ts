const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoney(cents: number) {
  return currencyFormatter.format(cents / 100);
}

export function formatMoneyCompact(cents: number) {
  const reais = cents / 100;
  const sign = reais < 0 ? "-" : "";
  const abs = Math.abs(reais);

  if (abs >= 1000) {
    return `${sign}R$ ${Math.round(abs / 1000)}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}
