/** Where the business runs — "today" for due dates is this calendar day, not the server's. */
export const BUSINESS_TIME_ZONE = "America/Sao_Paulo"

/**
 * Today's calendar day in São Paulo, as local noon of that day.
 *
 * On the server `new Date()` read with local getters gives the server's day
 * (UTC in production), which from 21h on in Brazil is already tomorrow — the
 * dashboard then counted tomorrow's entries as "vence hoje" while the accounts
 * screen, running in the browser, showed none. Noon (as in `fromDbDate`) keeps
 * the same day for any local-getter read, server or browser.
 */
export function businessToday(now: Date = new Date()): Date {
  const [year, month, day] = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number)
  return new Date(year, month - 1, day, 12)
}

/**
 * "23/11/2026 às 22:55" no horário de Brasília — para o "gerado em" dos
 * relatórios, que o servidor monta em UTC.
 */
export function formatBusinessDateTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: BUSINESS_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.day}/${parts.month}/${parts.year} às ${parts.hour}:${parts.minute}`
}
