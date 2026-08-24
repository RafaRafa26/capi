export type FluxoCaixaDia = {
  date: string;
  entradas: number;
  saidas: number;
};

// Gerador determinístico (mulberry32) só para ter uma série de mock estável.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateFluxoCaixaDiario(): FluxoCaixaDia[] {
  const random = mulberry32(2608);
  const start = new Date("2026-07-01T00:00:00");
  const days: FluxoCaixaDia[] = [];

  for (let i = 0; i < 62; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const entradas = isWeekend
      ? Math.round(random() * 400000)
      : Math.round(800000 + random() * 2600000);
    const saidas = isWeekend
      ? Math.round(random() * 250000)
      : Math.round(500000 + random() * 1800000);

    days.push({
      date: date.toISOString().slice(0, 10),
      entradas,
      saidas,
    });
  }

  return days;
}

export const fluxoCaixaDiario: FluxoCaixaDia[] = generateFluxoCaixaDiario();
