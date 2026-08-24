const POINTS = [
  { x: 0, y: 118, label: "01 Ago" },
  { x: 25, y: 96, label: "08 Ago" },
  { x: 50, y: 62, label: "17 Ago", today: true },
  { x: 75, y: 40, label: "24 Ago" },
  { x: 100, y: 18, label: "31 Ago" },
];

const VIEW_W = 800;
const VIEW_H = 160;

function toSvgX(x: number) {
  return (x / 100) * VIEW_W;
}

function pathFor(points: typeof POINTS) {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toSvgX(p.x)} ${p.y}`)
    .join(" ");
}

export function CashFlowChart() {
  const todayIndex = POINTS.findIndex((p) => p.today);
  const solid = POINTS.slice(0, todayIndex + 1);
  const projected = POINTS.slice(todayIndex);
  const todayX = toSvgX(POINTS[todayIndex].x);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-[160px] w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {[0, 40, 80, 120, 160].map((y) => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={VIEW_W}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}

        <line
          x1={todayX}
          y1={0}
          x2={todayX}
          y2={VIEW_H}
          className="stroke-[#f76b15]"
          strokeWidth={2}
        />
        <rect x={todayX - 32} y={4} width={64} height={16} rx={4} fill="#f76b15" />
        <text
          x={todayX}
          y={15}
          textAnchor="middle"
          className="fill-white text-[9px] font-bold"
        >
          HOJE (17)
        </text>

        <path
          d={pathFor(projected)}
          fill="none"
          className="stroke-[#0d9488] opacity-60"
          strokeWidth={2}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={pathFor(solid)}
          fill="none"
          className="stroke-[#0d9488]"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="text-muted-foreground mt-2 flex items-center justify-between px-2 text-[11px]">
        {POINTS.map((p) => (
          <span
            key={p.label}
            className={p.today ? "text-foreground font-semibold" : undefined}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
