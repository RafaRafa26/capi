"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

import { ctaClassName } from "./primitives"

type Billing = "monthly" | "yearly"

// [MOCK] Prices and limits are placeholders until the offer is defined; the
// features listed are only ones the product has today.
const PLANS = [
  {
    name: "Essencial",
    description: "Para começar a enxergar o seu financeiro.",
    monthly: 89,
    yearly: 71,
    features: [
      "Contas a pagar e a receber por vencimento",
      "Importação e conciliação do extrato",
      "Categorias ajustáveis ao seu negócio",
      "Até [X] contas bancárias",
      "1 usuário",
    ],
  },
  {
    name: "Profissional",
    description: "Para quem já divide o financeiro com alguém.",
    monthly: 169,
    yearly: 135,
    features: ["Tudo do Essencial", "Relatórios em PDF e Excel", "Até [X] contas bancárias", "Até [X] usuários com permissões"],
    recommended: true,
  },
  {
    name: "Empresas",
    description: "Para quem cuida de mais de um negócio.",
    monthly: 299,
    yearly: 239,
    features: ["Tudo do Profissional", "Várias empresas na mesma conta", "Contas bancárias ilimitadas", "Até [X] usuários com permissões"],
  },
]

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("yearly")

  return (
    <div className="flex flex-col items-center gap-10">
      <ToggleGroup
        aria-label="Forma de cobrança"
        spacing={0}
        value={[billing]}
        onValueChange={(value) => {
          if (value[0]) setBilling(value[0] as Billing)
        }}
        className="rounded-full bg-white/15 p-1"
      >
        <ToggleGroupItem
          value="monthly"
          className="h-10 rounded-full! px-5 text-white hover:bg-white/10 hover:text-white aria-pressed:bg-white aria-pressed:text-brand-stronger"
        >
          Mensal
        </ToggleGroupItem>
        <ToggleGroupItem
          value="yearly"
          className="h-10 gap-2 rounded-full! px-5 text-white hover:bg-white/10 hover:text-white aria-pressed:bg-white aria-pressed:text-brand-stronger"
        >
          Anual
          <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs text-white">-20%</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <ul className="grid w-full gap-6 lg:grid-cols-3 lg:items-center">
        {PLANS.map((plan) => {
          const price = billing === "monthly" ? plan.monthly : plan.yearly
          return (
            <li
              key={plan.name}
              className={cn(
                "relative flex flex-col gap-6 rounded-3xl bg-background p-6 text-foreground shadow-lg sm:p-8",
                plan.recommended && "shadow-2xl ring-4 ring-brand lg:py-12"
              )}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-6 rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">
                  Recomendado
                </span>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold">{plan.name}</h3>
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
                Quero saber onde estou
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
