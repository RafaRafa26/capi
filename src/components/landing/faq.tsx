import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "Preciso entender de finanças?",
    answer:
      "Não. Se você sabe o que vendeu e o que pagou, sabe usar o Capi. Você vê o que entrou, o que saiu e o que vai vencer, nas categorias que você mesmo define.",
  },
  {
    question: "Vou ter que organizar todo o meu passado antes de começar?",
    answer: "Não. Cadastre suas contas, importe o extrato do mês e lance o que vai vencer. O resto entra aos poucos.",
  },
  {
    question: "O Capi acessa a minha conta no banco?",
    answer:
      "Não. Você baixa o extrato em OFX no internet banking e importa no Capi. Se importar o mesmo arquivo duas vezes, nada se repete.",
  },
  {
    question: "Já tentei planilha e larguei. Por que seria diferente?",
    answer:
      "A planilha depende de você digitar tudo e lembrar de atualizar. No Capi, o extrato do banco entra pronto e você só confere.",
  },
  {
    question: "O que acontece depois dos 5 dias grátis?",
    answer:
      "Você escolhe um plano para continuar usando. Depois de assinar, ainda tem 14 dias para pedir o dinheiro de volta, sem precisar justificar.",
  },
  {
    question: "Quem pode ver os meus dados?",
    answer:
      "Só quem você convidar, com a permissão que você definir para cada pessoa. Os dados de cada empresa ficam separados.",
  },
]

export function Faq() {
  return (
    <ul className="divide-y rounded-2xl bg-background ring-1 ring-foreground/10">
      {QUESTIONS.map(({ question, answer }) => (
        <li key={question}>
          <Collapsible>
            <CollapsibleTrigger className="group flex min-h-14 w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/40">
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
