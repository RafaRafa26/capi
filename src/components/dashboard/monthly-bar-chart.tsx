import { cn } from "@/lib/utils";

export type MonthDatum = {
  label: string;
  value: number;
  display: string;
  current?: boolean;
};

export function MonthlyBarChart({ meses }: { meses: MonthDatum[] }) {
  if (meses.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Sem recebimentos conciliados ainda — o gráfico aparece assim que houver
        movimento no extrato.
      </p>
    );
  }

  const MAX = Math.max(...meses.map((d) => d.value), 1);

  return (
    <div className="flex h-[100px] w-full items-end justify-between">
      {meses.map((month) => (
        <div
          key={month.label}
          className="flex h-full w-[60px] flex-col items-center justify-end gap-1.5"
        >
          <span className="bg-muted rounded px-1 py-0.5 text-[9px] font-semibold">
            {month.display}
          </span>
          <div
            className={cn(
              "w-6 rounded-t opacity-60",
              month.current ? "bg-[#f76b15] opacity-100" : "bg-[#0d9488]",
            )}
            style={{ height: `${(month.value / MAX) * 95}px` }}
          />
          <span
            className={cn(
              "text-muted-foreground text-[10px]",
              month.current && "text-foreground font-bold",
            )}
          >
            {month.label}
          </span>
        </div>
      ))}
    </div>
  );
}
