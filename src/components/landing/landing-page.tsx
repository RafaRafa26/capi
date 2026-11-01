import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleCheck,
  FileUp,
  LogIn,
  ShieldCheck,
  Tags,
  X,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { EmailCta, GUARANTEE } from "./email-cta"
import { Faq } from "./faq"
import { BrowserFrame, Container, ImagePlaceholder, Logo, SectionHeading, ctaClassName } from "./primitives"
import { DesktopNav, MobileNav } from "./site-nav"

// Public landing page, shown at / to visitors without a session: a long-form
// sales letter built around the "Efeito Capivara". One action — create the
// account — repeated down the page, always next to the 14-day guarantee.
// [IMAGEM] marks the screenshots still to come; the price is R$ **** until
// it is set. No testimonials, client counts or statistics on purpose.
export function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        <Hero />
        <Opening />
        <Cost />
        <Capybara />
        <CapybaraEffect />
        <Outcome />
        <WhatItIsNot />
        <Audience />
        <Offer />
        <Questions />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/5 bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/" aria-label="Capi Gestão, página inicial" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-brand/40">
          <Logo />
        </Link>
        <DesktopNav />
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Below 380px there is no room for the label next to the brand. */}
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 px-2 text-sm max-[379px]:w-10 max-[379px]:px-0 sm:px-3")}>
            <LogIn className="hidden size-5 max-[379px]:block" aria-hidden />
            <span className="max-[379px]:sr-only">Entrar</span>
          </Link>
          <Link href="/signup" className={cn(buttonVariants(), ctaClassName, "h-10 px-3 text-sm sm:px-4")}>
            <span>
              Começar<span className="max-sm:hidden"> agora</span>
            </span>
          </Link>
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}

// Long-form paragraphs, kept to a comfortable reading width.
function Prose({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-5 text-lg leading-relaxed text-pretty text-foreground/80", className)} {...props} />
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_75%_30%,color-mix(in_oklch,var(--color-brand)_18%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_80%)] bg-[radial-gradient(var(--color-foreground)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06]"
      />
      <Container className="grid items-center gap-12 pt-10 pb-16 lg:grid-cols-12 lg:gap-10 lg:pt-16 lg:pb-24">
        <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 lg:col-span-6">
          <p className="w-fit rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand-stronger">
            Gestão financeira para pequenos negócios
          </p>
          <h1 id="hero-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            A calma de uma capivara para o financeiro do seu negócio.
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Para o pequeno empresário que hesita antes de abrir o extrato, leva sustos no fim do mês e decide no escuro.{" "}
            <strong className="text-foreground">Você não precisa virar especialista em finanças. Precisa enxergar onde está.</strong>
          </p>
          <EmailCta id="hero-email" />
        </div>
        <div className="relative lg:col-span-6">
          <BrowserFrame>
            <ImagePlaceholder
              className="aspect-[16/10] rounded-none border-0 bg-brand/5"
              description="painel do Capi com as contas a pagar e a receber por vencimento e o saldo conferido com o banco"
            />
          </BrowserFrame>
          <div className="absolute -bottom-6 -left-4 hidden w-64 rounded-xl bg-background p-4 shadow-xl ring-1 ring-foreground/10 sm:block">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CircleCheck className="size-4 text-brand-strong" aria-hidden />
              Conferido com o banco
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Extrato conciliado linha por linha</p>
          </div>
        </div>
      </Container>
    </section>
  )
}

// Acknowledge the anxiety first, then reframe it: missing map, not missing effort.
function Opening() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="scroll-mt-16 bg-muted/50 py-20">
      <Container className="flex max-w-2xl flex-col gap-14">
        <div className="flex flex-col gap-6">
          <h2 id="problema-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Você conhece aquele segundo antes de abrir o app do banco.
          </h2>
          <Prose>
            <p>
              O polegar fica parado em cima do ícone por um instante. Você respira, abre e faz a conta de cabeça.
              &ldquo;Dá. Acho que dá.&rdquo;
            </p>
            <p className="font-semibold text-foreground">Esse &ldquo;acho&rdquo; acompanha você o mês inteiro.</p>
            <p>
              Acha que pode pagar o fornecedor hoje. Acha que o boleto do aluguel é só semana que vem. Acha que sobrou
              dinheiro no mês passado, mas não sabe dizer para onde ele foi. Quando alguém pergunta &ldquo;e aí, a
              empresa está dando lucro?&rdquo;, você responde &ldquo;está indo&rdquo;, porque a verdade é que você não sabe.
            </p>
            <p>
              E não é por falta de esforço. Você é a primeira pessoa a chegar e a última a sair. Atende cliente, resolve
              problema de funcionário, negocia com fornecedor, apaga incêndio. O financeiro fica para &ldquo;quando der
              tempo&rdquo;. E nunca dá, porque mexer nele dá aquele frio na barriga.
            </p>
          </Prose>
        </div>
        <div className="flex flex-col gap-6">
          <h3 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            O problema não é você. É que ninguém te deu um mapa.
          </h3>
          <Prose>
            <p>
              Ninguém abre um negócio sabendo fazer gestão financeira. Você abriu porque sabe cozinhar, consertar,
              vender, atender, criar. A parte dos números veio junto, sem manual.
            </p>
            <p>
              Então você fez o que dava. Um caderno. Uma planilha que começou animada em janeiro e morreu em março. O
              saldo do banco como termômetro. A memória como sistema.
            </p>
            <p>
              O resultado é o que você sente hoje: <strong className="text-foreground">ansiedade</strong>. E a ansiedade
              vem de uma causa específica. Ela aparece quando você não sabe onde está.
            </p>
            <p className="text-xl font-semibold text-foreground">Quem vive no escuro leva susto com qualquer barulho.</p>
          </Prose>
        </div>
      </Container>
    </section>
  )
}

// The real cost of staying where you are.
const COSTS = [
  {
    lead: "Você paga caro por não saber.",
    text: "É o juro da conta que venceu sem você perceber. É a multa do boleto que estava na gaveta. É o desconto que você deu porque precisava do dinheiro agora, quando um mês de antecedência teria evitado a correria.",
  },
  {
    lead: "Você decide no escuro.",
    text: "Contratar alguém? Comprar mais estoque? Trocar o equipamento? Tirar um pró-labore maior? Cada decisão vira uma aposta. Quando dá errado, você só descobre semanas depois, quando o dinheiro já foi.",
  },
  {
    lead: "Você confunde saldo com dinheiro seu.",
    text: "O banco mostra um número bonito. Só que parte desse dinheiro já tem dono: o fornecedor que vence na quinta, o imposto do dia 20, a folha do mês. Você olha o saldo, se sente tranquilo, gasta, e o susto chega no dia 28.",
  },
  {
    lead: "Você não enxerga nem os problemas nem as oportunidades.",
    text: "Pode ter um cliente que sempre paga atrasado e está segurando o seu caixa. Um gasto que cresceu sem ninguém notar. Um produto que dá mais retorno do que você imagina. Está tudo nos seus números. Você só não consegue ver.",
  },
  {
    lead: "E tem o custo que não aparece em planilha nenhuma.",
    text: "O domingo à noite com o estômago apertado. A conversa difícil em casa. A sensação de trabalhar cada vez mais e controlar cada vez menos.",
  },
]

function Cost() {
  return (
    <section aria-labelledby="custo-title" className="bg-foreground py-20 text-background">
      <Container className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <h2 id="custo-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            O que custa continuar assim
          </h2>
          <p className="text-lg text-background/70">
            Vale olhar com calma, porque esse custo raramente aparece de uma vez. Ele vem em pequenas doses, todo mês.
          </p>
        </div>
        <div className="flex flex-col gap-10">
          <ul className="flex flex-col gap-7">
            {COSTS.map(({ lead, text }) => (
              <li key={lead} className="flex gap-4">
                <X className="mt-1.5 size-5 shrink-0 text-red-300" aria-hidden />
                <p className="text-lg leading-relaxed text-background/75">
                  <strong className="block text-background">{lead}</strong>
                  {text}
                </p>
              </li>
            ))}
          </ul>
          <p className="border-l-2 border-brand pl-5 text-xl font-semibold text-pretty">
            Nada disso se resolve com mais esforço. Você já se esforça muito. Resolve-se com clareza.
          </p>
        </div>
      </Container>
    </section>
  )
}

// The capybara: light tone, then the reframe that calm is security.
function Capybara() {
  return (
    <section aria-labelledby="capivara-title" className="py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="text-sm font-semibold text-brand-strong">Agora, a capivara</p>
          <h2 id="capivara-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Se existe um animal que entendeu a vida, é a capivara.
          </h2>
          <Prose>
            <p>
              Ela fica na beira do rio, cercada de jacaré, com um passarinho sentado na cabeça, e mantém a mesma expressão
              de quem acabou de tomar um café sem pressa. A internet inteira se pergunta como ela consegue.
            </p>
            <p>
              A resposta é menos mística do que parece.{" "}
              <strong className="text-foreground">A calma da capivara não é descuido. É segurança.</strong> Ela conhece o
              território, sabe onde está cada coisa e percebe o que se aproxima com antecedência. Nada a pega de surpresa, e
              por isso ela não precisa viver em alerta.
            </p>
            <p>
              O Capi Gestão foi feito para levar essa calma para o financeiro do seu negócio. Não a calma de quem fecha os
              olhos para o problema. A calma de quem enxerga o problema antes de ele virar crise.
            </p>
          </Prose>
        </div>
        <figure className="flex flex-col items-center gap-8 rounded-3xl bg-gradient-to-br from-brand/15 to-brand/0 px-8 py-12 text-center ring-1 ring-brand/20">
          <Image src="/brand/capi-logo.svg" alt="" width={160} height={160} className="size-32 sm:size-40" />
          <blockquote className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Calma não é sorte. É número no lugar.
          </blockquote>
        </figure>
      </Container>
    </section>
  )
}

// The unique mechanism: three shifts, each a before/after scene plus the
// feature that makes it possible (features as proof, never the headline).
const SHIFTS = [
  {
    title: "Do susto à previsibilidade",
    before:
      "É dia 25 e chega uma cobrança que você tinha esquecido. Você remaneja, adia outra conta, liga para o fornecedor pedindo prazo. O mês termina no sufoco, e você nem sabe exatamente por quê.",
    after:
      "Você abre o Capi na segunda-feira de manhã e vê o que vai entrar e o que vai sair nas próximas semanas. A conta do dia 25 está lá desde o começo do mês. Se o caixa vai apertar, você descobre no dia 5, com tempo de agir: cobrar quem está devendo, negociar um prazo, segurar uma compra.",
    icon: CalendarClock,
    proof:
      "No Capi, suas contas a pagar e a receber ficam organizadas por vencimento, num lugar só. Você vê o que está vencendo, o que está atrasado e o que vem pela frente.",
    closing: "O susto vem sempre do que você não viu chegar. Quando você vê, ele vira planejamento.",
    image: "contas a pagar e a receber organizadas por vencimento, com as atrasadas em destaque",
  },
  {
    title: "Do achismo à certeza",
    before:
      "O banco mostra um saldo alto e você se sente bem. Mas quanto disso é seu de verdade? Quanto já está comprometido com o que vence esta semana? Você faz a conta de cabeça, erra para o lado otimista e descobre o erro tarde demais.",
    after:
      "Você coloca o saldo do banco lado a lado com o que já está comprometido e sabe quanto daquele dinheiro realmente está livre. E não é um número que você acha. São números conferidos contra o seu extrato, linha por linha.",
    icon: FileUp,
    proof:
      "Você importa o extrato do banco no Capi e concilia cada movimentação com o lançamento correspondente. O que o sistema mostra bate com o que o banco mostra. Se não bater, você fica sabendo.",
    closing:
      "Planilhas mostram o que você digitou, não o que aconteceu. A diferença entre as duas coisas é exatamente o tamanho da sua ansiedade.",
    image: "tela de conciliação ligando cada movimentação do extrato ao lançamento correspondente",
  },
  {
    title: "Do caos à rotina leve",
    before:
      "Você deixa acumular, um dia tira a tarde inteira para colocar tudo em dia, se afoga em papel e jura que da próxima vez vai manter organizado. Não mantém, porque ninguém mantém um esforço que dói.",
    after:
      "A gestão vira um hábito curto, que cabe na semana: importar o extrato, conferir o que entrou e saiu, olhar os vencimentos. E com cada movimentação categorizada, os números param de ser uma massa confusa e começam a contar uma história.",
    icon: Tags,
    proof:
      "O Capi organiza receitas e despesas em categorias que você ajusta ao seu negócio, gera relatórios em PDF ou Excel para o contador ou um sócio e deixa você convidar alguém da equipe, com o acesso que você definir.",
    closing: "A rotina se mantém porque é leve. E, quando é leve, você não larga.",
    image: "relatório de receitas e despesas por categoria",
  },
]

function CapybaraEffect() {
  return (
    <section id="efeito-capivara" aria-labelledby="efeito-capivara-title" className="scroll-mt-16 bg-muted/50 py-20">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          id="efeito-capivara-title"
          eyebrow="O Efeito Capivara"
          title="As três mudanças que tiram você do modo incêndio"
          description="O Capi não te transforma em contador. Ele organiza o caminho entre o “acho que dá” e o “eu sei onde estou”. Esse caminho tem três passagens."
        />
        <ol className="flex flex-col gap-20">
          {SHIFTS.map(({ title, before, after, icon: Icon, proof, closing, image }, index) => (
            <li key={title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className={cn("flex flex-col gap-6", index % 2 === 1 && "lg:order-last")}>
                <h3 className="flex items-center gap-3 text-2xl font-bold tracking-tight sm:text-3xl">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-strong text-base text-white">
                    {index + 1}
                  </span>
                  {title}
                </h3>
                <div className="grid gap-4">
                  <div className="rounded-2xl bg-background p-5 ring-1 ring-foreground/10">
                    <p className="text-sm font-semibold text-muted-foreground">Antes</p>
                    <p className="mt-1.5 leading-relaxed text-foreground/80">{before}</p>
                  </div>
                  <div className="rounded-2xl bg-brand/10 p-5 ring-1 ring-brand/25">
                    <p className="text-sm font-semibold text-brand-stronger">Depois</p>
                    <p className="mt-1.5 leading-relaxed text-foreground/90">{after}</p>
                  </div>
                </div>
                <p className="flex gap-3 leading-relaxed text-muted-foreground">
                  <Icon className="mt-1 size-5 shrink-0 text-brand-strong" aria-hidden />
                  <span>
                    <strong className="text-foreground">O que torna isso possível: </strong>
                    {proof}
                  </span>
                </p>
                <p className="text-lg font-semibold text-pretty">{closing}</p>
              </div>
              <BrowserFrame>
                <ImagePlaceholder description={image} className="aspect-[16/10] rounded-none border-0" />
              </BrowserFrame>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

const OUTCOMES = [
  "Você abre o extrato sem aquele segundo de hesitação.",
  "Você sabe responder, com número, se o mês foi bom ou não.",
  "Você vê o cliente que está atrasando, o gasto que está crescendo e a semana em que o caixa vai apertar, antes de virarem problema.",
  "Você decide se contrata, compra ou investe olhando para os seus números, e não para o seu humor do dia.",
]

function Outcome() {
  return (
    <section aria-labelledby="resultado-title" className="py-20">
      <Container className="flex max-w-3xl flex-col gap-10">
        <SectionHeading
          id="resultado-title"
          title="Onde as três mudanças levam você"
          description="Junte as três e o resultado aparece no seu dia a dia."
        />
        <ul className="flex flex-col gap-4">
          {OUTCOMES.map((outcome) => (
            <li key={outcome} className="flex gap-3 rounded-2xl p-5 text-lg ring-1 ring-foreground/10">
              <Check className="mt-1 size-5 shrink-0 text-brand-strong" aria-hidden />
              {outcome}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 text-center">
          <p className="text-lg text-pretty text-foreground/80">
            Você para de apagar incêndio e passa a tomar decisões com a calma de quem sabe exatamente onde está.
          </p>
          <p className="text-2xl font-bold tracking-tight text-balance">
            A capivara não é tranquila porque o rio é seguro. É tranquila porque conhece o rio.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Link href="/signup" className={cn(buttonVariants(), ctaClassName)}>
            Quero meus números no lugar
            <ArrowRight aria-hidden />
          </Link>
          <p className="text-center text-sm text-muted-foreground">{GUARANTEE}</p>
        </div>
      </Container>
    </section>
  )
}

// Honesty as credibility while there is no social proof yet.
const NOT_LIST = [
  {
    title: "O Capi não é contabilidade.",
    text: "Seu contador continua cuidando de impostos, obrigações e balanço. O Capi cuida da parte que o contador não acompanha: a sua rotina de decisões, semana a semana.",
  },
  {
    title: "O Capi não emite nota fiscal, boleto nem Pix.",
    text: "Ele organiza o que você já recebe e paga.",
  },
  {
    title: "O Capi não faz mágica sozinho.",
    text: "Ele precisa de alguns minutos seus por semana para importar o extrato e conferir os lançamentos. Em troca, você nunca mais precisa daquela tarde inteira de colocar tudo em dia.",
  },
  {
    title: "O Capi não promete que você vai faturar mais.",
    text: "O que ele promete é que você vai saber. O que você faz com essa clareza é decisão sua, e agora vai ser uma decisão bem informada.",
  },
]

function WhatItIsNot() {
  return (
    <section id="o-que-nao-e" aria-labelledby="o-que-nao-e-title" className="scroll-mt-16 bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="o-que-nao-e-title"
          eyebrow="Sem letra miúda"
          title="O que o Capi não é"
          description="Prefiro ser direto com você, porque confiança se constrói com honestidade e não com promessa."
        />
        <ul className="grid gap-6 md:grid-cols-2">
          {NOT_LIST.map(({ title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-2xl bg-background p-6 ring-1 ring-foreground/10">
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="leading-relaxed text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

const FOR_YOU = [
  "Você tem um pequeno negócio e sente que o financeiro está mais ou menos sob controle, mas não consegue explicar os próprios números.",
  "Você já tentou planilha, caderno ou aplicativo e largou.",
  "Você quer tomar decisões com base em números, só não sabe por onde começar.",
  "Você está cansado de levar susto no fim do mês.",
]

const NOT_FOR_YOU = [
  "Você procura alguém que faça a gestão no seu lugar, sem que você precise olhar.",
  "Você já tem um processo financeiro estruturado, com relatórios e conciliação em dia, e está satisfeito com ele.",
]

function Audience() {
  return (
    <section id="para-quem" aria-labelledby="para-quem-title" className="scroll-mt-16 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="para-quem-title" eyebrow="Para quem é" title="O Capi foi feito para quem quer enxergar o próprio negócio" />
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-5 rounded-2xl bg-brand/5 p-6 ring-1 ring-brand/25 sm:p-8">
            <h3 className="text-xl font-semibold">É para você se:</h3>
            <ul className="flex flex-col gap-4">
              {FOR_YOU.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed">
                  <Check className="mt-1 size-5 shrink-0 text-brand-strong" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-5 rounded-2xl p-6 ring-1 ring-foreground/10 sm:p-8">
            <h3 className="text-xl font-semibold">Não é para você se:</h3>
            <ul className="flex flex-col gap-4">
              {NOT_FOR_YOU.map((item) => (
                <li key={item} className="flex gap-3 leading-relaxed text-muted-foreground">
                  <X className="mt-1 size-5 shrink-0" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  )
}

const INCLUDED = [
  "Contas a pagar e a receber organizadas por vencimento",
  "Importação e conciliação do extrato bancário",
  "Categorias de receita e despesa ajustáveis ao seu negócio",
  "Relatórios em PDF e Excel",
  "Acesso para a sua equipe, com as permissões que você definir",
]

// Single plan; the price stays R$ **** until it is defined.
function Offer() {
  return (
    <section id="plano" aria-labelledby="plano-title" className="scroll-mt-16 bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="plano-title" eyebrow="A oferta" title="Um plano, tudo incluído" />
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-6 rounded-2xl bg-background p-6 shadow-xl ring-2 shadow-brand/15 ring-brand-strong sm:p-8">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Capi Gestão</h3>
              <p className="text-muted-foreground">Tudo o que você precisa para colocar os números no lugar.</p>
            </div>
            <p>
              <span className="text-4xl font-bold tracking-tight tabular-nums">R$ ****</span>
              <span className="text-muted-foreground"> por mês</span>
            </p>
            <ul className="flex flex-col gap-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <Check className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/signup" className={cn(buttonVariants(), ctaClassName, "mt-auto w-full")}>
              Quero meus números no lugar
              <ArrowRight aria-hidden />
            </Link>
          </div>
          <div
            id="garantia"
            className="flex scroll-mt-24 flex-col gap-5 rounded-2xl bg-background p-6 ring-1 ring-foreground/10 sm:p-8"
          >
            <span className="flex size-12 items-center justify-center rounded-xl bg-brand/10 text-brand-strong">
              <ShieldCheck className="size-6" aria-hidden />
            </span>
            <h3 className="text-2xl font-bold tracking-tight text-balance">Garantia de 14 dias: o risco fica com a gente</h3>
            <Prose className="gap-4 text-base">
              <p>
                Sabemos o que você está pensando: &ldquo;e se eu assinar e largar, como larguei a planilha?&rdquo;
              </p>
              <p>
                Por isso a garantia existe. Use o Capi por 14 dias. Importe seu extrato, organize suas contas, veja seus
                números no lugar. Se nesse prazo você achar que o Capi não é para você, por qualquer motivo, devolvemos o
                valor pago. Sem burocracia, sem formulário de cinco páginas, sem precisar justificar.
              </p>
            </Prose>
            <p className="mt-auto text-lg font-semibold text-pretty">
              Ou o Capi traz clareza para o seu financeiro, ou você não paga por ele.
            </p>
          </div>
        </div>
      </Container>
    </section>
  )
}

function Questions() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading
          id="faq-title"
          align="left"
          eyebrow="Dúvidas"
          title="Perguntas que você talvez esteja se fazendo"
        />
        <Faq />
      </Container>
    </section>
  )
}

function FinalCta() {
  return (
    <section aria-labelledby="cta-final-title" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 overflow-hidden rounded-3xl bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-brand-strong),var(--color-brand-stronger))] px-6 py-16 text-white sm:px-12">
        <h2 id="cta-final-title" className="max-w-3xl text-center text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Você não precisa de mais coragem para abrir o extrato. Precisa de clareza.
        </h2>
        <div className="flex max-w-2xl flex-col gap-4 text-lg leading-relaxed text-pretty text-white/85">
          <p>Pense no seu próximo mês de dois jeitos.</p>
          <p>
            No primeiro, tudo continua como está. O &ldquo;acho que dá&rdquo;, a cobrança esquecida, a decisão no escuro,
            o domingo à noite com o estômago apertado.
          </p>
          <p>
            No segundo, você abre o Capi na segunda-feira, vê o que vem pela frente, confere o que aconteceu e toma as
            decisões da semana sabendo exatamente onde está. Os problemas continuam existindo, porque eles sempre existem.
            Mas agora você os vê chegando.
          </p>
          <p className="text-xl font-semibold text-white">
            A diferença entre os dois meses não é sorte. É número no lugar.
          </p>
        </div>
        <EmailCta id="final-email" tone="brand" className="items-center text-center" />
        <p className="max-w-2xl border-t border-white/20 pt-6 text-sm leading-relaxed text-pretty text-white/80">
          <strong className="text-white">P.S.:</strong> Se você leu até aqui, provavelmente sabe que o financeiro do seu
          negócio merece mais atenção do que vem recebendo. Não precisa resolver tudo hoje. Precisa dar o primeiro passo:
          colocar os números no lugar. Os 14 dias de garantia existem para que esse passo não tenha risco.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t">
      <Container className="flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-xs flex-col gap-3">
          <Logo />
          <p className="text-sm text-muted-foreground">A calma de uma capivara para o financeiro do seu negócio.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Já tem conta? Entrar
          </Link>
          <span className="text-muted-foreground">[LINK: Termos de uso]</span>
          <span className="text-muted-foreground">[LINK: Política de privacidade]</span>
        </nav>
      </Container>
      <Container className="border-t py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Capi Gestão. [razão social e CNPJ]
      </Container>
    </footer>
  )
}
