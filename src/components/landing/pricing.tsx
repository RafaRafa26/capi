"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import { ctaClassName } from "./primitives"

type Billing = "monthly" | "yearly"

// [MOCK] Placeholder plans and prices — replace with the real offer.
const PLANS = [
  {
    name: "Reprehenderit",
    description: "Voluptate velit esse cillum fugiat nulla.",
    monthly: 149,
    yearly: 119,
    features: ["Pariatur excepteur sint", "Occaecat cupidatat non", "Proident sunt culpa qui", "Officia deserunt"],
  },
  {
    name: "Mollit",
    description: "Anim id est laborum lorem.",
    monthly: 299,
    yearly: 239,
    features: [
      "Ipsum dolor sit",
      "Amet consectetur adipiscing",
      "Elit sed do eiusmod",
      "Tempor incididunt ut labore et",
    ],
    recommended: true,
  },
  {
    name: "Dolore",
    description: "Magna aliqua enim ad minim.",
    monthly: 599,
    yearly: 479,
    features: ["Veniam quis", "Nostrud exercitation ullamco laboris nisi", "Aliquip ex ea", "Commodo consequat"],
  },
]

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("yearly")

  return (
    <div className="flex flex-col items-center gap-10">
      <ToggleGroup
        aria-label="Forma de cobrança"
        variant="outline"
        spacing={0}
        value={[billing]}
        onValueChange={(value) => {
          if (value[0]) setBilling(value[0] as Billing)
        }}
        className="rounded-lg bg-background"
      >
        <ToggleGroupItem value="monthly" className="h-10 px-4 aria-pressed:bg-brand/10 aria-pressed:text-brand-stronger">
          Mensal
        </ToggleGroupItem>
        <ToggleGroupItem value="yearly" className="h-10 gap-2 px-4 aria-pressed:bg-brand/10 aria-pressed:text-brand-stronger">
          Anual
          <span className="rounded-full bg-brand-strong px-1.5 py-0.5 text-xs text-white">Duis</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <ul className="grid w-full gap-6 lg:grid-cols-3 lg:items-center">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.monthly : plan.yearly
          return (
            <li
              key={plan.name}
              className={cn(
                "relative flex flex-col gap-6 rounded-2xl bg-background p-6 ring-1 ring-foreground/10",
                plan.recommended && "shadow-xl ring-2 shadow-brand/15 ring-brand-strong lg:py-10"
              )}
            >
              {plan.recommended && (
                <Badge className="absolute -top-2.5 left-6 bg-brand-strong text-white">Aute irure</Badge>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <p aria-live="polite">
                <span className="text-4xl font-bold tracking-tight tabular-nums">{currency.format(price)}</span>
                <span className="text-muted-foreground">/mês</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {billing === "yearly" ? "cobrado anualmente" : "cobrado mês a mês"} · [MOCK]
                </span>
              </p>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ variant: plan.recommended ? "default" : "outline" }),
                  "h-11 text-base",
                  plan.recommended && ctaClassName
                )}
              >
                Testar grátis
              </Link>
              <ul className="flex flex-col gap-2.5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="size-4 shrink-0 translate-y-0.5 text-brand-strong" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
