import Image from "next/image"

import { cn } from "@/lib/utils"

// Building blocks shared by the landing page sections.

// The one primary action, styled the same wherever it repeats.
export const ctaClassName =
  "h-12 gap-2 rounded-full bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-[background-color,box-shadow,translate] hover:-translate-y-0.5 hover:bg-capi-purple-deep hover:shadow-lg hover:shadow-capi-purple/25 focus-visible:ring-ring/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"

// What the visitor gets by clicking, repeated next to every primary action.
export const OFFER_TERMS = ["5 dias grátis", "Sem cartão", "Sem falar com vendedor"]

export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />
}

export function Logo({ className, white }: { className?: string; white?: boolean }) {
  return (
    <Image
      src={white ? "/brand/capi-gestao-baixo-branco.svg" : "/brand/capi-gestao-baixo.svg"}
      alt="Capi Gestão"
      width={1173}
      height={368}
      className={cn("h-8 w-auto sm:h-10", className)}
    />
  )
}

export function OfferTerms({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-2 gap-y-1 text-sm", className)}>
      {OFFER_TERMS.map((term, index) => (
        <li key={term} className="flex items-center gap-2">
          {index > 0 && <span aria-hidden>·</span>}
          {term}
        </li>
      ))}
    </ul>
  )
}

// Browser window chrome around a product screenshot.
export function BrowserFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 shadow-capi-purple/15 ring-foreground/10", className)}>
      <div className="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2" aria-hidden>
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
        <span className="size-2.5 rounded-full bg-foreground/15" />
      </div>
      {children}
    </div>
  )
}

export const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
