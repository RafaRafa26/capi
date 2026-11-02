import Form from "next/form"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { ctaClassName } from "./primitives"

export const GUARANTEE = "Garantia de 14 dias. Se não for para você, devolvemos o valor."

// Progressive disclosure: only the e-mail here; the sign-up page picks it
// up from ?email= and asks for the rest.
export function EmailCta({
  id,
  tone = "light",
  className,
}: {
  id: string
  tone?: "light" | "brand"
  className?: string
}) {
  const onBrand = tone === "brand"

  return (
    <div className={cn("flex w-full max-w-xl flex-col gap-3", className)}>
      <Form action="/signup" className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={id} className="sr-only">
          Seu e-mail de trabalho
        </label>
        <Input
          id={id}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@empresa.com.br"
          className={cn("h-11 bg-background px-3.5 text-base sm:min-w-56 sm:flex-1 md:text-base", onBrand && "border-transparent")}
        />
        <Button
          type="submit"
          className={cn(
            ctaClassName,
            onBrand && "bg-white text-brand-stronger hover:bg-white/90 focus-visible:ring-white/60"
          )}
        >
          Quero saber onde estou
          <ArrowRight aria-hidden />
        </Button>
      </Form>
      <p className={cn("text-sm", onBrand ? "text-white/85" : "text-muted-foreground")}>
        {GUARANTEE}
      </p>
    </div>
  )
}
