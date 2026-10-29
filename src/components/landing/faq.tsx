import { ChevronDown } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const QUESTIONS = [
  {
    question: "Tempor incididunt ut labore et dolore magna?",
    answer: "Aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo.",
  },
  {
    question: "Consequat duis aute irure in reprehenderit voluptate?",
    answer: "Velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum lorem ipsum.",
  },
  {
    question: "Dolor sit amet consectetur adipiscing elit?",
    answer: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam.",
  },
  {
    question: "Quis nostrud exercitation ullamco laboris nisi aliquip ex ea?",
    answer: "Commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat.",
  },
  {
    question: "Cupidatat non proident sunt culpa qui officia deserunt?",
    answer: "Mollit anim id est laborum lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore.",
  },
  {
    question: "Et dolore magna aliqua?",
    answer: "Enim ad minim veniam quis nostrud.",
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
