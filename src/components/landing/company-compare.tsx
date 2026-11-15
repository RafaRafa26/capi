import { CircleCheck, CircleHelp } from "lucide-react"

import { cn } from "@/lib/utils"

import { brl } from "./primitives"

// The headline as a picture: the same day at the two companies, side by
// side. Both have the same bank balance; only one can answer the questions
// that follow. A simplified drawing with made-up figures, every answer being
// something the app's dashboard shows.
const QUESTIONS = [
  { question: "Quanto ainda entra neste mês?", answer: brl(38600) },
  { question: "Quanto ainda sai?", answer: brl(32940.1) },
  { question: "O que está atrasado?", answer: "3 contas a pagar" },
]

const BALANCE = brl(21733.6)

const cell = "w-1/2 px-3 pb-4 align-top sm:px-5"
const capiCell = "bg-capi-lilac-light"

export function CompanyCompare() {
  return (
    <div className="rounded-3xl bg-background p-4 shadow-2xl ring-1 shadow-capi-purple/15 ring-foreground/10 sm:p-6">
      <p className="text-sm font-medium text-muted-foreground">Dia 20, fim da tarde</p>
      <table className="mt-3 w-full table-fixed border-separate border-spacing-x-2 border-spacing-y-0 text-left sm:border-spacing-x-3">
        <caption className="sr-only">O que cada empresa sabe sobre o próprio dinheiro</caption>
        <thead>
          <tr>
            <th scope="col" className="rounded-t-2xl bg-muted px-3 pt-4 pb-3 text-base font-extrabold sm:px-5 sm:text-lg">
              Empresa A
            </th>
            <th scope="col" className={cn("rounded-t-2xl px-3 pt-4 pb-3 text-base font-extrabold text-primary sm:px-5 sm:text-lg", capiCell)}>
              Empresa B
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={cn(cell, "bg-muted")}>
              <Label>Saldo em conta</Label>
              <Value>{BALANCE}</Value>
              <p className="mt-1 text-xs text-muted-foreground">No aplicativo do banco</p>
            </td>
            <td className={cn(cell, capiCell)}>
              <Label>Saldo em conta</Label>
              <Value>{BALANCE}</Value>
              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-capi-green-text">
                <CircleCheck className="size-3.5 shrink-0" aria-hidden />
                Conferido com o banco
              </p>
            </td>
          </tr>
          {QUESTIONS.map(({ question, answer }, index) => {
            const last = index === QUESTIONS.length - 1
            return (
              <tr key={question}>
                <td className={cn(cell, "bg-muted", last && "rounded-b-2xl")}>
                  <Label>{question}</Label>
                  <CircleHelp className="size-6 text-muted-foreground/60" role="img" aria-label="Não sabe" />
                </td>
                <td className={cn(cell, capiCell, last && "rounded-b-2xl")}>
                  <Label>{question}</Label>
                  <Value
                    className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-backwards motion-safe:duration-500"
                    style={{ animationDelay: `${0.6 + index * 0.25}s` }}
                  >
                    {answer}
                  </Value>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-muted-foreground">Ilustração simplificada, com valores fictícios.</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 border-t border-foreground/10 pt-3 text-xs text-pretty text-muted-foreground sm:text-sm">{children}</p>
}

function Value({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <p style={style} className={cn("text-base font-bold tracking-tight tabular-nums sm:text-xl", className)}>
      {children}
    </p>
  )
}
