import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react"

import { FlowChartCardSkeletonBody } from "@/components/overview/flow-chart-card"
import { overviewChartClassName, overviewGridClassName } from "@/components/overview/layout"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Route-level fallbacks for `loading.tsx`: every (app) page is dynamic (it
 * reads the session cookie), so without them a sidebar click shows nothing
 * until the server has finished every query. With them the layout stays put
 * and this paints immediately while the page streams in.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-8.5 w-48" />
      <div className="flex flex-col gap-2 rounded-xl border p-3">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

/** Mirrors AccountsView's layout (filters, summary cards, table) so nothing jumps when it loads. */
export function AccountsPageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-290 flex-col gap-5 px-6 pt-7" aria-busy="true" aria-label="Carregando">
      {/* pt-5: room for the "Vencimento" label AccountsView shows above its filters. */}
      <div className="flex flex-wrap items-end gap-2.5 pt-5">
        <Skeleton className="h-8.5 w-44" />
        <Skeleton className="h-8.5 w-65" />
        <Skeleton className="h-8.5 w-32" />
        <Skeleton className="ml-auto h-8.5 w-28" />
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex min-w-37.5 flex-1 flex-col gap-2 rounded-lg px-3 py-2">
            <Skeleton className="h-3 w-20 bg-background/60" />
            <Skeleton className="h-6 w-32 bg-background/60" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-col rounded-xl border">
          <div className="h-10 border-b" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex h-19.5 items-center gap-6 border-b px-3 last:border-b-0">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OverviewRowSkeleton({ withAmount = false }: { withAmount?: boolean }) {
  return (
    <div className="-mx-2 flex min-h-10 items-center gap-2.5 border-t px-2">
      <Skeleton className="size-2 rounded-full" />
      <Skeleton className="h-3.5 w-2/5" />
      {withAmount && (
        <>
          <Skeleton className="ml-auto h-4.5 w-6 rounded-full" />
          <Skeleton className="h-3.5 w-24" />
        </>
      )}
    </div>
  )
}

function OverviewBucketCardSkeleton({ title, icon, area }: { title: string; icon: React.ReactNode; area: string }) {
  return (
    <div className={`rounded-xl border bg-card px-4 pt-3.5 pb-2 ${area}`}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h2>
      {Array.from({ length: 3 }, (_, i) => (
        <OverviewRowSkeleton key={i} withAmount />
      ))}
    </div>
  )
}

/** Mirrors OverviewView's cards (same grid, same paddings) so nothing jumps when it loads. */
export function OverviewPageSkeleton() {
  return (
    <div className={overviewGridClassName} aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-4 [grid-area:side]">
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card px-4 py-3.5">
          <div className="flex h-6 items-center justify-between">
            <span className="text-[12.5px] text-muted-foreground">Saldo atual</span>
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-7 w-40" />
        </div>
        <div className="rounded-xl border bg-card px-4 pt-3.5 pb-2">
          <h2 className="mb-2 text-sm font-semibold">Pontos de atenção</h2>
          {Array.from({ length: 3 }, (_, i) => (
            <OverviewRowSkeleton key={i} />
          ))}
        </div>
      </div>

      <div className={`flex min-h-[260px] flex-col gap-2.5 rounded-xl border bg-card px-4 py-3.5 ${overviewChartClassName}`}>
        <FlowChartCardSkeletonBody />
      </div>

      <OverviewBucketCardSkeleton title="Contas a receber" icon={<ArrowUpRightIcon className="size-4" />} area="[grid-area:rec]" />
      <OverviewBucketCardSkeleton title="Contas a pagar" icon={<ArrowDownRightIcon className="size-4" />} area="[grid-area:pay]" />
    </div>
  )
}
