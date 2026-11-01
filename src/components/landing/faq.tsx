import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "Eu não entendo nada de finanças. Vou conseguir usar?",
    answer:
      "O Capi foi pensado justamente para quem não é da área. Você não precisa saber termos técnicos. Precisa saber o que entrou, o que saiu e o que vai vencer, e o sistema organiza o resto.",
  },
  {
    question: "Não tenho tempo para mais uma tarefa.",
    answer:
      "Você já gasta tempo com o financeiro hoje: procurando boleto, refazendo conta de cabeça, resolvendo o susto do fim do mês. O Capi troca esse tempo espalhado e estressante por uma rotina curta e previsível.",
  },
  {
    question: "Meu banco funciona com o Capi?",
    answer:
      "Você baixa o extrato no seu banco no formato OFX, que a maioria dos bancos oferece no internet banking, e importa no Capi. Se importar o mesmo arquivo duas vezes, nada se repete.",
  },
  {
    question: "E meus dados?",
    answer: "Os dados de cada empresa ficam separados, e só acessa quem você convidar.",
  },
  {
    question: "Ainda preciso de contador?",
    answer:
      "Sim. O contador cuida das obrigações fiscais. O Capi cuida da sua visão do dia a dia. Os dois se complementam, e os relatórios do Capi ainda facilitam a conversa com o seu contador.",
  },
  {
    question: "E se eu não gostar?",
    answer: "Você tem 14 dias. Se não for para você, devolvemos o valor pago.",
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
