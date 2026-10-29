import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "[COPY] Preciso de cartão de crédito para testar?",
    answer: "[COPY] Não. Você cria a conta só com e-mail e senha e testa por [X] dias.",
  },
  {
    question: "[COPY] Consigo usar o extrato do meu banco?",
    answer: "[COPY] Sim. Você baixa o extrato em OFX no seu banco e importa na Capi. Se importar o mesmo arquivo de novo, nada se repete.",
  },
  {
    question: "[COPY] A Capi emite boleto ou PIX?",
    answer: "[COPY] Não. A Capi organiza o que você já recebe e repassa. Ela não emite cobrança.",
  },
  {
    question: "[COPY] Meus dados e os dos meus clientes ficam seguros?",
    answer: "[COPY] Cada empresa só enxerga os próprios dados, e toda alteração fica registrada com quem fez e quando.",
  },
  {
    question: "[COPY] Dá para usar com mais de uma empresa?",
    answer: "[COPY] Sim. Você troca de empresa sem sair da conta e convida sua equipe com o papel certo em cada uma.",
  },
  {
    question: "[COPY] Posso cancelar quando quiser?",
    answer: "[COPY] Pode. Sem multa e sem fidelidade.",
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
