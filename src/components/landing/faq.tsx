import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "Não entendo de finanças. Vou conseguir usar?",
    answer: "Sim. Você só precisa saber o que entrou, o que saiu e o que vai vencer. O Capi organiza o resto.",
  },
  {
    question: "Não tenho tempo para mais uma tarefa.",
    answer: "São alguns minutos por semana, no lugar das horas que o susto do fim do mês já toma.",
  },
  {
    question: "Meu banco funciona com o Capi?",
    answer: "Se ele exporta o extrato em OFX, sim, e a maioria dos bancos exporta.",
  },
  {
    question: "E meus dados?",
    answer: "Os dados de cada empresa ficam separados, e só acessa quem você convidar.",
  },
  {
    question: "Ainda preciso de contador?",
    answer: "Sim. Ele cuida do fiscal; o Capi cuida da sua visão do dia a dia.",
  },
  {
    question: "E se eu não gostar?",
    answer: "Você tem 14 dias para pedir o dinheiro de volta.",
  },
]

export function Faq() {
  return (
    <ul className="divide-y rounded-2xl bg-background ring-1 ring-foreground/10">
      {QUESTIONS.map(({ question, answer }) => (
        <li key={question}>
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-brand/40">
              {question}
              <ChevronDown
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-5 pb-4 text-muted-foreground">{answer}</CollapsibleContent>
          </Collapsible>
        </li>
      ))}
    </ul>
  )
}
