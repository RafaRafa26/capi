"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowDownLeft, ArrowUpRight, CircleCheck, CircleHelp, Landmark } from "lucide-react"

import { cn } from "@/lib/utils"

import { brl } from "./primitives"

type Company = "a" | "b"

const BALANCE = 21733.6

const OPTIONS: { value: Company; label: string }[] = [
  { value: "a", label: "Empresa A" },
  { value: "b", label: "Empresa B" },
]

// The headline, made clickable: the same day at the two companies. One only
// has the bank balance; the other sees it broken down in Capi. A simplified
// drawing of the real dashboard, with made-up figures.
export function CompanyCompare() {
  const [company, setCompany] = useState<Company>("a")
  const touched = useRef(false)
  const reduceMotion = useReducedMotion()

  // Flip once on its own to hint that the switch is there; never again after
  // the visitor takes over.
  useEffect(() => {
    if (reduceMotion) return
    const timer = setTimeout(() => {
      if (!touched.current) setCompany("b")
    }, 2800)
    return () => clearTimeout(timer)
  }, [reduceMotion])

  const choose = (value: Company) => {
    touched.current = true
    setCompany(value)
  }

  return (
    <div className="rounded-3xl bg-background p-4 shadow-2xl ring-1 shadow-capi-purple/15 ring-foreground/10 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Escolha a empresa" className="flex rounded-full bg-muted p-1">
          {OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`empresa-${value}-tab`}
              aria-selected={company === value}
              aria-controls="empresa-painel"
              onClick={() => choose(value)}
              className={cn(
                "relative h-10 rounded-full px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/40",
                company === value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {company === value && (
                <motion.span
                  layoutId="empresa-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.15 }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-muted-foreground">Dia 20, fim da tarde</p>
      </div>

      <div
        id="empresa-painel"
        role="tabpanel"
        aria-labelledby={`empresa-${company}-tab`}
        className="mt-4 grid min-h-[21rem] sm:min-h-[19.5rem]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={company}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            {company === "a" ? <BankOnly /> : <WithCapi />}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">Ilustração simplificada, com valores fictícios.</p>
    </div>
  )
}

const UNKNOWNS = ["Quanto ainda entra neste mês?", "Quanto ainda sai?", "Quanto desse saldo é meu?"]

function BankOnly() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-2xl bg-muted p-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Landmark className="size-4" aria-hidden />
          Aplicativo do banco
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{brl(BALANCE)}</p>
        <p className="text-sm text-muted-foreground">Saldo em conta</p>
      </div>
      <ul className="flex flex-1 flex-col justify-between gap-2">
        {UNKNOWNS.map((question) => (
          <li
            key={question}
            className="flex items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground"
          >
            {question}
            <CircleHelp className="size-5 shrink-0 text-muted-foreground/60" role="img" aria-label="Não sabe" />
          </li>
        ))}
      </ul>
    </div>
  )
}

const ALERTS = [
  { tone: "bg-negative", text: "3 contas a pagar vencidas" },
  { tone: "bg-warning", text: "1 pagamento vence hoje" },
]

function WithCapi() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-2xl bg-capi-lilac-light p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-capi-green-text">
          <CircleCheck className="size-4" aria-hidden />
          Conferido com o extrato do banco
        </p>
        <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{brl(BALANCE)}</p>
        <p className="text-sm text-muted-foreground">Saldo atual</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4 ring-1 ring-foreground/10">
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowDownLeft className="size-4 text-positive" aria-hidden />A receber
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{brl(38600)}</dd>
        </div>
        <div className="rounded-xl p-4 ring-1 ring-foreground/10">
          <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowUpRight className="size-4 text-negative" aria-hidden />A pagar
          </dt>
          <dd className="mt-1 text-lg font-bold tabular-nums sm:text-xl">{brl(32940.1)}</dd>
        </div>
      </dl>
      <ul className="flex flex-1 flex-col justify-center gap-2 rounded-xl px-4 py-3 text-sm ring-1 ring-foreground/10">
        {ALERTS.map(({ tone, text }) => (
          <li key={text} className="flex items-center gap-2.5">
            <span className={cn("size-2 rounded-full", tone)} aria-hidden />
            {text}
          </li>
        ))}
      </ul>
    </div>
  )
}
