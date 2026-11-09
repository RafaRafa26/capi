import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "Já tentei planilha e larguei. Por que com o Capi seria diferente?",
    answer:
      "A planilha depende de você digitar tudo e lembrar de atualizar. No Capi, o extrato do banco entra pronto e você só confere. É menos trabalho, e por isso fica mais fácil manter. Se mesmo assim não virar hábito, você tem 14 dias para pedir o dinheiro de volta.",
  },
  {
    question: "Preciso entender de contabilidade?",
    answer:
      "Não. Se você sabe o que vendeu e o que pagou, sabe usar o Capi. Você vê o que entrou, o que saiu e o que vai vencer, organizado em categorias que você mesmo define.",
  },
  {
    question: "Vou ter que organizar todo o meu passado antes de começar?",
    answer: "Não. Você cadastra suas contas, importa o extrato do mês e lança o que vai vencer. O resto pode entrar aos poucos.",
  },
  {
    question: "Vou ter que digitar o extrato do banco?",
    answer:
      "Não. Você baixa o extrato em OFX no internet banking e importa no Capi. Se importar o mesmo arquivo duas vezes, nada se repete.",
  },
  {
    question: "Meus dados financeiros ficam seguros?",
    answer: "Os dados de cada empresa ficam separados, e só acessa quem você convidar, com a permissão que você escolher.",
  },
  {
    question: "O Capi substitui o meu contador?",
    answer:
      "Não, e nem tenta. O contador cuida dos impostos e das obrigações. O Capi dá a você a visão do dia a dia, e os relatórios em PDF e Excel facilitam a conversa com ele.",
  },
  {
    question: "Consigo dividir o acesso com meu sócio ou funcionário?",
    answer: "Sim. Você convida quem quiser e define o que cada pessoa pode ver e fazer.",
  },
  {
    question: "E se eu assinar e não gostar?",
    answer: "Você tem 14 dias. Se não for para você, devolvemos o valor pago, sem burocracia e sem precisar justificar.",
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
