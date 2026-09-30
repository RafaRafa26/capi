// Grid shared by OverviewView and its loading skeleton, so nothing jumps when
// the page streams in. ≥1100px: 3fr 2fr 5fr tracks — side column + chart on
// row 1, receivables + payables on row 2. Below that: one stacked column.
export const overviewGridClassName =
  "mx-auto grid w-full max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-4 px-6 py-5 [grid-template-areas:'side'_'rec'_'pay'_'chart'] min-[1100px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,5fr)] min-[1100px]:[grid-template-areas:'side_chart_chart'_'rec_rec_pay']"

// Side by side, the chart stretches to row 1's height (= the side column) in
// pure CSS, so it's already right in the server HTML. Stacked, it takes the
// side column's measured height through --side-h (auto until measured).
export const overviewChartClassName =
  "[grid-area:chart] h-(--side-h) min-[1100px]:h-auto min-[1100px]:self-stretch max-[699px]:hidden"
