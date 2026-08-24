import { cn } from "@/lib/utils";

type MonthDatum = {
  label: string;
  value: number;
  display: string;
  current?: boolean;
};

const DATA: MonthDatum[] = [
  { label: "Set 25", value: 95, display: "R$ 95k" },
  { label: "Out", value: 110, display: "R$ 110k" },
  { label: "Nov", value: 135, display: "R$ 135k" },
  { label: "Dez", value: 80, display: "R$ 80k" },
  { label: "Jan 26", value: 120, display: "R$ 120k" },
  { label: "Fev", value: 145, display: "R$ 145k" },
  { label: "Mar", value: 165, display: "R$ 165k" },
  { label: "Abr", value: 130, display: "R$ 130k" },
  { label: "Mai", value: 155, display: "R$ 155k" },
  { label: "Jun", value: 190, display: "R$ 190k" },
  { label: "Jul", value: 140, display: "R$ 140k" },
  { label: "Ago", value: 143, display: "R$ 143k", current: true },
];

const MAX = Math.max(...DATA.map((d) => d.value));

export function MonthlyBarChart() {
  return (
    <div className="flex h-[100px] w-full items-end justify-between">
      {DATA.map((month) => (
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
