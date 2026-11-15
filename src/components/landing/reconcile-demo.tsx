"use client"

import { useState } from "react"
import Link from "next/link"
import NumberFlow from "@number-flow/react"
import { ArrowRight, Check, FileText, Landmark, RotateCcw } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { brl, ctaClassName } from "./primitives"

// Each pair shares an id: the bank line and the entry it settles.
const BANK_LINES = [
  { id: "mesas", date: "12/11", description: "TED RECEBIDA CAFE FOLHA VERDE", amount: 7200 },
  { id: "madeira", date: "13/11", description: "PIX ENVIADO MADEIREIRA SAO JORGE", amount: -3980 },
  { id: "comoda", date: "14/11", description: "PIX RECEBIDO BRUNA SIQUEIRA", amount: 1600 },
]

const ENTRIES = [
  { id: "madeira", description: "Madeira maciça, pedido 482", contact: "Madeireira São Jorge", amount: -3980 },
  { id: "comoda", description: "Restauro de cômoda", contact: "Bruna Siqueira", amount: 1600 },
  { id: "mesas", description: "Mesas do salão, entrada", contact: "Café Folha Verde", amount: 7200 },
]

const BANK_BALANCE = 21733.6
const STARTING_CHECKED = BANK_BALANCE - BANK_LINES.reduce((sum, line) => sum + line.amount, 0)

// A hands-on cut of the reconciliation screen: pick a bank line, then the
// entry it pays, and watch the checked balance catch up with the bank's.
// Simplified on purpose, with made-up data.
export function ReconcileDemo() {
  const [matched, setMatched] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(BANK_LINES[0].id)
  const [wrong, setWrong] = useState<string | null>(null)
  const [status, setStatus] = useState("Escolha o lançamento que corresponde à linha do extrato em destaque.")

  const done = matched.length === BANK_LINES.length
  const checked =
    STARTING_CHECKED + BANK_LINES.filter((line) => matched.includes(line.id)).reduce((sum, line) => sum + line.amount, 0)

  const pickEntry = (id: string) => {
    if (!selected) {
      setStatus("Escolha primeiro uma linha do extrato.")
      return
    }
    if (id !== selected) {
      setWrong(id)
      setStatus("Os valores não batem. Tente outro lançamento.")
      setTimeout(() => setWrong(null), 450)
      return
    }
    const next = [...matched, id]
    setMatched(next)
    setSelected(BANK_LINES.find((line) => !next.includes(line.id))?.id ?? null)
    setStatus(
      next.length === BANK_LINES.length
        ? "Tudo conferido: o saldo do Capi é igual ao do banco."
        : `Conciliado. ${next.length === 1 ? "Faltam 2 linhas" : "Falta 1 linha"}.`
    )
  }

  const reset = () => {
    setMatched([])
    setSelected(BANK_LINES[0].id)
    setStatus("Escolha o lançamento que corresponde à linha do extrato em destaque.")
  }

  return (
    <div className="rounded-3xl bg-background p-4 shadow-xl ring-1 shadow-capi-purple/10 ring-foreground/10 sm:p-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <Balance label="Saldo no banco" value={BANK_BALANCE} />
        <Balance label="Saldo conferido no Capi" value={checked} highlight={done} />
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full origin-left rounded-full bg-capi-green-text transition-transform duration-500 motion-reduce:transition-none"
          style={{ transform: `scaleX(${matched.length / BANK_LINES.length})` }}
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Landmark className="size-4" aria-hidden />
            Extrato do banco
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {BANK_LINES.map((line) => {
              const isMatched = matched.includes(line.id)
              return (
                <li key={line.id}>
                  <button
                    type="button"
                    disabled={isMatched}
                    aria-pressed={selected === line.id}
                    onClick={() => setSelected(line.id)}
                    className={cn(
                      rowClassName,
                      selected === line.id && "bg-capi-lilac-light ring-2 ring-primary",
                      isMatched && matchedClassName
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{line.description}</span>
                      <span className="text-xs text-muted-foreground">{line.date}</span>
                    </span>
                    <Amount value={line.amount} matched={isMatched} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <FileText className="size-4" aria-hidden />
            Lançamentos do Capi
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {ENTRIES.map((entry) => {
              const isMatched = matched.includes(entry.id)
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={isMatched}
                    onClick={() => pickEntry(entry.id)}
                    className={cn(
                      rowClassName,
                      !isMatched && "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
                      wrong === entry.id && "ring-2 ring-negative motion-safe:animate-[capi-shake_0.4s]",
                      isMatched && matchedClassName
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{entry.description}</span>
                      <span className="text-xs text-muted-foreground">{entry.contact}</span>
                    </span>
                    <Amount value={entry.amount} matched={isMatched} />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex min-h-12 flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className={cn("text-sm", done ? "font-semibold text-capi-green-text" : "text-muted-foreground")}>
          {status}
        </p>
        {done && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className={cn(buttonVariants({ variant: "ghost" }), "h-12 gap-2 rounded-full px-4 text-base")}
            >
              <RotateCcw aria-hidden />
              Refazer
            </button>
            <Link href="/signup" className={cn(buttonVariants(), ctaClassName)}>
              Fazer com os meus números
              <ArrowRight aria-hidden />
            </Link>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Demonstração simplificada, com dados fictícios.</p>
    </div>
  )
}

const rowClassName =
  "flex min-h-16 w-full items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-left ring-1 ring-foreground/10 outline-none transition-[background-color,box-shadow,translate] focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none"

const matchedClassName = "bg-capi-green/10 ring-capi-green-text/30"

function Balance({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-4 transition-colors duration-500", highlight ? "bg-capi-green/15" : "bg-muted")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight tabular-nums">
        <NumberFlow value={value} locales="pt-BR" format={{ style: "currency", currency: "BRL" }} />
      </p>
    </div>
  )
}

function Amount({ value, matched }: { value: number; matched: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2 text-sm font-semibold tabular-nums">
      <span className={value < 0 ? "text-negative" : "text-positive"}>{brl(value)}</span>
      {matched && <Check className="size-4 text-capi-green-text" role="img" aria-label="Conciliado" />}
    </span>
  )
}
