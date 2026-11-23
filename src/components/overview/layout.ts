// Grid shared by OverviewView and its loading skeleton, so nothing jumps when
// the page streams in. ≥1100px: 3fr 2fr 5fr tracks — balance + chart on row 1,
// receivables + payables on row 2. Below that: one stacked column.
export const overviewGridClassName =
  "mx-auto grid w-full max-w-[1160px] grid-cols-[minmax(0,1fr)] items-start gap-4 px-6 py-5 [grid-template-areas:'side'_'rec'_'pay'_'chart'] min-[1100px]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,5fr)] min-[1100px]:[grid-template-areas:'side_chart_chart'_'rec_rec_pay']"

/** Balance card: side by side it stretches to row 1's height, like the chart. */
export const overviewBalanceClassName = "[grid-area:side] min-[1100px]:self-stretch"

// Side by side, the chart stretches to row 1's height (set by the balance card)
// in pure CSS. Stacked, it has a fixed height of its own.
export const overviewChartClassName =
  "[grid-area:chart] h-[300px] min-[1100px]:h-auto min-[1100px]:self-stretch max-[699px]:hidden"
