import Link from "next/link"
import { CircleCheck, LogIn } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { EmailCta } from "./email-cta"
import { Faq } from "./faq"
import { Pricing } from "./pricing"
import { BrowserFrame, Container, ImagePlaceholder, Logo, SectionHeading, ctaClassName } from "./primitives"
import { DesktopNav, MobileNav } from "./site-nav"

// Public landing page, shown at / to visitors without a session. Short on
// text on purpose: each block is a title, one line and a visual. [PRINT],
// [ILUSTRAÇÃO] and [ÍCONE 3D] mark the visuals still to come, at their final
// aspect ratio; prices are [MOCK]. No testimonials or client numbers.
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
        <Pain />
        <Capybara />
        <CapybaraEffect />
        <Plans />
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

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_75%_35%,color-mix(in_oklch,var(--color-brand)_18%,transparent),transparent_70%)]"
      />
      <Container className="grid items-center gap-14 pt-12 pb-20 lg:grid-cols-12 lg:gap-10 lg:pt-20 lg:pb-28">
        <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 lg:col-span-6">
          <p className="w-fit rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand-stronger">
            Gestão financeira para pequenos negócios
          </p>
          <h1 id="hero-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            A <span className="text-brand-strong">calma</span> de uma capivara para o financeiro do seu negócio.
          </h1>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            Veja o que vai entrar e sair, confira seus números com o banco e decida sabendo onde está.
          </p>
          <EmailCta id="hero-email" />
        </div>
        <div className="relative lg:col-span-6">
          <ImagePlaceholder
            label="ILUSTRAÇÃO"
            description="capivara espiando pela borda do painel"
            className="absolute -top-14 -right-2 z-10 size-28 rounded-full bg-background p-2 text-[0.65rem] sm:size-32"
          />
          <BrowserFrame>
            <ImagePlaceholder
              label="PRINT"
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

const PAINS = [
  {
    title: "Dia 28, 23h.",
    text: "Você refaz a conta pela terceira vez para ver se a folha fecha.",
    icon: "relógio marcando 23h sobre uma calculadora",
  },
  {
    title: "“Venceu ontem.”",
    text: "O boleto esquecido volta com multa, e você liga pedindo prazo de novo.",
    icon: "boleto com carimbo de vencido",
  },
  {
    title: "O saldo parecia folgado.",
    text: "Você comprou estoque. Na quinta, o imposto levou o resto.",
    icon: "caixa de estoque com moedas saindo dela",
  },
  {
    title: "“E aí, está dando?”",
    text: "Alguém em casa pergunta. Você diz “está indo” e muda de assunto.",
    icon: "balão de conversa com reticências",
  },
]

// First color band: the pain, kept to one line per card.
function Pain() {
  return (
    <section id="problema" aria-labelledby="problema-title" className="scroll-mt-16 bg-foreground py-20 text-background lg:py-28">
      <Container className="flex flex-col gap-12">
        <div className="mx-auto flex max-w-2xl flex-col gap-4 text-center">
          <h2 id="problema-title" className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Você sabe quanto vendeu. <span className="text-brand">Não sabe quanto sobrou.</span>
          </h2>
          <p className="text-lg text-pretty text-background/70">E é nessa diferença que mora a ansiedade.</p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PAINS.map(({ title, text, icon }) => (
            <li key={title} className="flex flex-col gap-3 rounded-3xl bg-background/[0.06] p-4 ring-1 ring-background/10 sm:gap-4 sm:p-6">
              <ImagePlaceholder
                label="ÍCONE 3D"
                description={icon}
                className="aspect-[4/3] w-full rounded-2xl border-brand/50 bg-brand/10 p-2 text-[0.6rem] text-background/60 sm:text-xs"
              />
              <h3 className="font-semibold sm:text-lg">{title}</h3>
              <p className="text-sm text-background/70 sm:text-base">{text}</p>
            </li>
          ))}
        </ul>
        <p className="text-center text-xl font-semibold text-balance sm:text-2xl">
          Você não está fazendo nada errado. <span className="text-brand">Está trabalhando sem enxergar.</span>
        </p>
      </Container>
    </section>
  )
}

function Capybara() {
  return (
    <section aria-labelledby="capivara-title" className="py-20 lg:py-28">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <ImagePlaceholder
          label="ILUSTRAÇÃO"
          description="capivara tranquila na beira do rio, cercada de jacarés, com um passarinho na cabeça"
          className="aspect-[4/3] rounded-3xl"
        />
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-brand-strong">Por que uma capivara?</p>
          <h2 id="capivara-title" className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Calma não é sorte. <span className="text-brand-strong">É não ser pego de surpresa.</span>
          </h2>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            A capivara vive cercada de jacaré e continua tranquila. Não porque ignora o perigo, mas porque vê ele chegando.
            O Capi faz isso pelo seu financeiro: mostra o problema enquanto ainda dá tempo de agir.
          </p>
        </div>
      </Container>
    </section>
  )
}

const SHIFTS = [
  {
    title: "Do susto à previsibilidade",
    text: "Contas a pagar e a receber por vencimento, num lugar só. Você vê o aperto no dia 5, não no dia 28.",
    image: "contas a pagar e a receber por vencimento, com as atrasadas em destaque",
  },
  {
    title: "Do achismo à certeza",
    text: "Importe o extrato e confira cada lançamento com o banco. Você sabe quanto do saldo é seu de verdade.",
    image: "conciliação ligando o extrato do banco aos lançamentos",
  },
  {
    title: "Do caos à rotina leve",
    text: "Alguns minutos por semana, com tudo categorizado. Leve o bastante para você não largar.",
    image: "receitas e despesas por categoria",
  },
]

function CapybaraEffect() {
  return (
    <section id="efeito-capivara" aria-labelledby="efeito-capivara-title" className="scroll-mt-16 bg-muted/50 py-20 lg:py-28">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="efeito-capivara-title"
          eyebrow="O Efeito Capivara"
          title="Do “acho que dá” ao “eu sei que dá”."
          description="Três mudanças que o Capi faz no seu financeiro."
        />
        <ol className="grid gap-6 lg:grid-cols-3">
          {SHIFTS.map(({ title, text, image }, index) => (
            <li key={title} className="flex flex-col gap-6 overflow-hidden rounded-3xl bg-background p-6 pb-0 ring-1 ring-foreground/10 sm:p-8 sm:pb-0">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-strong text-sm font-semibold text-white">
                {index + 1}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                <p className="text-pretty text-muted-foreground">{text}</p>
              </div>
              <ImagePlaceholder
                label="PRINT"
                description={image}
                className="mt-auto aspect-[4/3] translate-y-2 rounded-b-none text-xs"
              />
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}

// Second color band: plans and the guarantee.
function Plans() {
  return (
    <section
      id="planos"
      aria-labelledby="planos-title"
      className="scroll-mt-16 bg-[radial-gradient(120%_80%_at_50%_0%,var(--color-brand-strong),var(--color-brand-stronger))] py-20 text-white lg:py-28"
    >
      <Container className="flex flex-col gap-12">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
          <h2 id="planos-title" className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            Escolha o plano do seu tamanho.
          </h2>
          <p className="text-lg text-white/85">Todos com garantia de 14 dias.</p>
        </div>
        <Pricing />
        <div
          id="garantia"
          className="mx-auto grid w-full max-w-4xl scroll-mt-24 items-center gap-6 rounded-3xl bg-background p-6 text-foreground sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8"
        >
          <ImagePlaceholder
            label="ILUSTRAÇÃO"
            description="capivara segurando um escudo"
            className="mx-auto size-36 rounded-2xl text-xs sm:size-40"
          />
          <div className="flex flex-col gap-2 text-center sm:text-left">
            <h3 className="text-2xl font-bold tracking-tight">Garantia de 14 dias</h3>
            <p className="text-pretty text-muted-foreground">
              Use o Capi por 14 dias. Se não for para você, devolvemos o valor pago, sem burocracia e sem precisar justificar.
            </p>
            <p className="font-semibold">Ou o Capi traz clareza, ou você não paga.</p>
          </div>
        </div>
      </Container>
    </section>
  )
}

function Questions() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading id="faq-title" align="left" eyebrow="Dúvidas" title="Perguntas frequentes" />
        <Faq />
      </Container>
    </section>
  )
}

function FinalCta() {
  return (
    <section aria-labelledby="cta-final-title" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-3xl bg-brand/10 p-8 ring-1 ring-brand/20 sm:p-12 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-5">
          <h2 id="cta-final-title" className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
            A calma começa <span className="text-brand-strong">quando você enxerga.</span>
          </h2>
          <p className="max-w-lg text-lg text-pretty text-muted-foreground">
            Comece hoje e veja o próximo mês chegar, em vez de levar susto com ele.
          </p>
          <EmailCta id="final-email" />
        </div>
        <ImagePlaceholder
          label="ILUSTRAÇÃO"
          description="capivara relaxando, de olhos fechados"
          className="aspect-square w-full max-w-xs justify-self-center rounded-3xl bg-background"
        />
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
