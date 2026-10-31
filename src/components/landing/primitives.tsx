import Image from "next/image"

import { cn } from "@/lib/utils"

// Building blocks shared by the landing page sections.

// The one primary action, styled the same wherever it repeats.
export const ctaClassName =
  "h-11 gap-2 rounded-lg bg-brand-strong px-5 text-base text-white hover:bg-brand-stronger focus-visible:ring-brand/40"

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-base font-semibold tracking-tight whitespace-nowrap max-[379px]:text-[15px] sm:gap-2.5 sm:text-lg", className)}>
      <Image src="/brand/capi-logo.svg" alt="" width={40} height={40} className="size-8 sm:size-10" />
      {/* The narrowest phones show only the mark; the header link keeps the name. */}
      <span className="max-[349px]:sr-only">Capi Gestão</span>
    </span>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "center",
}: {
  id: string
  eyebrow?: string
  title: string
  description?: string
  align?: "center" | "left"
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-3", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="text-sm font-semibold text-brand-strong">{eyebrow}</p>}
      <h2 id={id} className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {title}
      </h2>
      {description && <p className="text-lg text-pretty text-muted-foreground">{description}</p>}
    </div>
  )
}

// Stands in for a real image until it exists, at the final aspect ratio so
// the layout does not shift when it is swapped in.
export function ImagePlaceholder({
  description,
  label = "IMAGEM",
  className,
}: {
  description: string
  label?: string
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={`[${label}: ${description}]`}
      className={cn(
        "flex items-center justify-center rounded-xl border-2 border-dashed border-brand/40 bg-brand/5 p-4 text-center text-sm text-balance text-muted-foreground",
        className
      )}
    >
      <span aria-hidden>
        [{label}: {description}]
      </span>
    </div>
  )
}

// Browser window chrome around a product screenshot.
export function BrowserFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-background shadow-2xl ring-1 shadow-brand/10 ring-foreground/10", className)}>
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="ml-3 h-4 w-40 rounded bg-foreground/5" />
      </div>
      {children}
    </div>
  )
}

// Round photo slot for testimonials and the hero's face pile.
export function AvatarPlaceholder({ className, showLabel = true }: { className?: string; showLabel?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-brand/40 bg-brand/5 text-[0.6rem] font-medium text-muted-foreground",
        className
      )}
    >
      {showLabel && "FOTO"}
    </span>
  )
}
