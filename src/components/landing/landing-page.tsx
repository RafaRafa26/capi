import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Building2, CalendarClock, FileText, HandCoins, LogIn, Percent, Users } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Faq } from "./faq"
import { HomeLink } from "./home-link"
import { BrowserFrame, Container, Logo, OfferTerms, ctaClassName } from "./primitives"
import { ReconcileDemo } from "./reconcile-demo"
import { Reveal } from "./reveal"
import { DesktopNav, MobileNav } from "./site-nav"
import { StickyCta } from "./sticky-cta"

// Public landing page, shown at / to visitors without a session. It follows
// the arc of a classic sales letter: a promise (hero), the same day before
// and after, what makes the difference, the product shown rather than
// described, a hands-on demo, the offer, objections, and the promise again.
// Screenshots are the real app with a made-up company; prices are masked
// until the offer is defined. No testimonials or client numbers.
export function LandingPage() {
  return (
    <div className="landing flex min-h-svh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" className="flex-1">
        <Hero />
        <Story />
        <Difference />
        <Product />
        <Demo />
        <AlsoDoes />
        <Offer />
        <Questions />
        <Closing />
      </main>
      <Footer />
      <StickyCta watch="hero-cta" />
    </div>
  )
}

function SignUpLink({ children = "Criar conta grátis", className, id }: { children?: React.ReactNode; className?: string; id?: string }) {
  return (
    <Link id={id} href="/signup" className={cn(buttonVariants(), ctaClassName, className)}>
      {children}
      <ArrowRight aria-hidden />
    </Link>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/5 bg-background/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <HomeLink />
        <DesktopNav />
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Below 380px there is no room for the label next to the brand. */}
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "h-10 rounded-full px-2 text-sm max-[379px]:w-10 max-[379px]:px-0 sm:px-4")}>
            <LogIn className="hidden size-5 max-[379px]:block" aria-hidden />
            <span className="max-[379px]:sr-only">Entrar</span>
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants(), ctaClassName, "h-10 px-4 text-sm hover:translate-y-0 max-sm:hidden")}
          >
            Criar conta grátis
          </Link>
          <MobileNav />
        </div>
      </Container>
    </header>
  )
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden bg-capi-lilac-light">
      <Container className="flex flex-col items-center gap-12 pt-12 pb-16 lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="flex max-w-4xl flex-col items-center gap-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <p className="w-fit rounded-full bg-background px-3.5 py-1.5 text-sm font-semibold text-primary ring-1 ring-capi-lilac/30">
            Gestão financeira de verdade
          </p>
          <h1 id="hero-title" className="text-[clamp(2.5rem,7vw,5rem)] leading-[1.02] font-extrabold tracking-tight text-balance">
            Chegue ao fim do mês sabendo, <span className="text-primary">não torcendo.</span>
          </h1>
          <p className="max-w-2xl text-lg text-pretty text-foreground/70 sm:text-xl">
            O Capi mostra o que vai entrar, o que vai sair e quanto do saldo é realmente seu, sem complicação.
          </p>
          <div className="flex w-full flex-col items-center gap-3">
            <SignUpLink id="hero-cta" className="w-full sm:w-fit" />
            <OfferTerms className="justify-center text-foreground/70" />
          </div>
        </div>
        <div className="w-full max-w-5xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <BrowserFrame>
            <Image
              src="/landing/painel.png"
              width={2208}
              height={1280}
              alt="Painel do Capi com saldo atual, pontos de atenção, fluxo de caixa e contas a receber e a pagar separadas em vencidas, vencem hoje e a vencer."
              unoptimized
              preload
              className="h-auto w-full"
            />
          </BrowserFrame>
          <p className="mt-3 text-center text-xs text-muted-foreground">Tela real do Capi, com os dados de uma empresa fictícia.</p>
        </div>
      </Container>
    </section>
  )
}

// The same day of the month, before and after.
function Story() {
  return (
    <section aria-labelledby="historia-title" className="py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <Reveal className="flex max-w-3xl flex-col gap-4">
          <h2 id="historia-title" className="text-4xl font-extrabold tracking-tight text-balance text-primary sm:text-6xl">
            O mesmo dia 20, de dois jeitos.
          </h2>
          <p className="text-lg text-pretty text-muted-foreground sm:text-xl">
            Faltam dez dias para o mês acabar. Ainda tem conta para pagar, cliente para receber e uma decisão esperando por
            você.
          </p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="flex flex-col gap-3 rounded-3xl bg-muted p-6 sm:p-8">
            <p className="text-sm font-semibold text-muted-foreground">Torcendo</p>
            <p className="text-xl font-semibold text-pretty sm:text-2xl">
              Você abre o aplicativo do banco, vê o saldo e faz a conta de cabeça.
            </p>
            <p className="text-lg text-muted-foreground">Descobre no dia 30 se deu.</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-3 rounded-3xl bg-capi-lilac-light p-6 ring-1 ring-capi-lilac/30 sm:p-8">
            <p className="text-sm font-semibold text-primary">Sabendo</p>
            <p className="text-xl font-semibold text-pretty sm:text-2xl">
              Você vê quanto ainda entra, quanto ainda sai e o que está atrasado.
            </p>
            <p className="text-lg text-muted-foreground">Decide na hora se contrata, se compra ou se espera.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

// A full-bleed band of the brand color: what separates the two companies,
// in oversized type.
function Difference() {
  return (
    <section aria-labelledby="diferenca-title" className="bg-capi-purple py-24 text-white lg:py-36">
      <Container>
        <Reveal className="flex flex-col gap-8">
          <h2 id="diferenca-title" className="text-xl font-bold sm:text-2xl">
            O que faz a diferença?
          </h2>
          <p className="max-w-3xl text-2xl text-pretty text-white/80 sm:text-3xl">
            Não é trabalhar mais. Não é vender mais. Nem entender de contabilidade.
          </p>
          <p className="text-[clamp(2.5rem,8vw,6rem)] leading-[1.02] font-extrabold tracking-tight text-balance">
            É enxergar os próprios números <span className="text-capi-green">antes de precisar deles.</span>
          </p>
          <p className="text-xl font-semibold sm:text-2xl">O Capi existe para isso.</p>
        </Reveal>
      </Container>
    </section>
  )
}

// Real screens of the app: 2x captures served as they are, with no
// recompression, so the text stays sharp. On wide screens they show close to
// actual size; on phones the whole screen shrinks to fit the width.
const VIEWS = [
  {
    title: "O que vence nesta semana.",
    text: "Contas a pagar e a receber por vencimento, com as atrasadas em destaque. O aperto aparece no dia 5, não no dia 28.",
    alt: "Lista de contas a receber do Capi, com os totais de vencidos, vencem hoje, a vencer e recebidos, e cada lançamento com vencimento, cliente e situação.",
    src: "/landing/contas-a-receber.png",
    width: 2208,
    height: 1560,
  },
  {
    title: "O saldo que é seu de verdade.",
    text: "Importe o extrato do banco e confira lançamento por lançamento. Importou o mesmo arquivo duas vezes? Nada se repete.",
    alt: "Tela Contas e Extratos do Capi, com saldo, entradas e saídas do mês, o gráfico do saldo dia a dia e o extrato da conta com cada lançamento.",
    src: "/landing/contas-e-extratos.png",
    width: 2560,
    height: 1880,
  },
  {
    title: "Para onde o dinheiro foi.",
    text: "Receitas e despesas nas categorias que você define, com relatórios em PDF e Excel para levar ao sócio ou ao contador.",
    alt: "Lista de contas a pagar do Capi, com categoria, fornecedor, vencimento e situação de cada conta, e botão de exportar.",
    src: "/landing/contas-a-pagar.png",
    width: 2208,
    height: 1560,
  },
]

function Product() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-16 py-20 lg:py-28">
      <Container className="flex flex-col gap-16 lg:gap-24">
        <Reveal className="flex max-w-3xl flex-col gap-4">
          <h2 id="como-funciona-title" className="text-4xl font-extrabold tracking-tight text-balance text-primary sm:text-6xl">
            Abra o Capi numa segunda-feira de manhã. <span className="text-foreground">É isto que você vê.</span>
          </h2>
        </Reveal>
        {VIEWS.map(({ title, text, alt, src, width, height }, index) => (
          <Reveal key={title} className="flex flex-col gap-8">
            <div className="grid gap-4 lg:grid-cols-[auto_2fr_3fr] lg:items-start lg:gap-8">
              <p className="flex size-10 items-center justify-center rounded-full bg-capi-lilac-light text-base font-bold text-primary" aria-hidden>
                {index + 1}
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h3>
              <p className="text-lg text-pretty text-muted-foreground">{text}</p>
            </div>
            <BrowserFrame>
              <Image src={src} width={width} height={height} alt={alt} unoptimized className="h-auto w-full" />
            </BrowserFrame>
          </Reveal>
        ))}
        <p className="text-sm text-muted-foreground">Telas reais do Capi, com os dados de uma empresa fictícia.</p>
      </Container>
    </section>
  )
}

function Demo() {
  return (
    <section id="demonstracao" aria-labelledby="demonstracao-title" className="scroll-mt-16 bg-capi-lilac-light py-20 lg:py-28">
      <Container className="flex max-w-5xl flex-col gap-10">
        <Reveal className="flex max-w-2xl flex-col gap-4">
          <h2 id="demonstracao-title" className="text-4xl font-extrabold tracking-tight text-balance text-primary sm:text-6xl">
            Experimente antes de criar a conta.
          </h2>
          <p className="text-lg text-pretty text-foreground/70 sm:text-xl">
            Três linhas do extrato ainda não foram conferidas. Ligue cada uma ao lançamento certo e veja o saldo bater com o
            do banco.
          </p>
        </Reveal>
        <Reveal>
          <ReconcileDemo />
        </Reveal>
      </Container>
    </section>
  )
}

const EXTRAS = [
  { icon: CalendarClock, text: "Vendas parceladas, com as parcelas geradas automaticamente" },
  { icon: Percent, text: "Juros, multa e desconto registrados no recebimento" },
  { icon: FileText, text: "Recibos em PDF numerados" },
  { icon: Building2, text: "Várias empresas na mesma conta" },
  { icon: Users, text: "Sócio e equipe com a permissão que você escolher" },
  { icon: HandCoins, text: "Controle de valores recebidos em nome de terceiros e seus repasses" },
]

function AlsoDoes() {
  return (
    <section aria-labelledby="tambem-faz-title" className="bg-capi-purple py-20 text-white lg:py-28">
      <Container className="flex flex-col gap-10">
        <Reveal>
          <h2 id="tambem-faz-title" className="max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            E quando a sua operação pedir mais
          </h2>
        </Reveal>
        <Reveal>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex min-h-36 flex-col justify-between gap-6 rounded-2xl bg-capi-purple-deep p-5">
                <p className="text-lg font-bold text-pretty">{text}</p>
                <span className="flex size-9 items-center justify-center rounded-full bg-capi-purple" aria-hidden>
                  <Icon className="size-4" />
                </span>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  )
}

// How the trial and the guarantee follow each other, so they read as one
// offer and not two competing promises. The price is masked for now.
const STEPS = [
  { when: "Hoje", text: "Crie a conta, sem cartão. Importe o extrato deste mês e veja seus números." },
  { when: "Por 5 dias", text: "Use o Capi inteiro, de graça, com os dados da sua empresa." },
  { when: "Se assinar", text: "Planos a partir de R$ ** por mês, com 14 dias para pedir o dinheiro de volta, sem precisar justificar." },
]

function Offer() {
  return (
    <section id="preco" aria-labelledby="preco-title" className="scroll-mt-16 overflow-hidden bg-capi-cream pt-12 pb-20 lg:pt-16 lg:pb-28">
      {/* Decorative: the page's closing line passing by. Stands still for
          visitors who prefer reduced motion. */}
      <div aria-hidden className="flex w-max motion-safe:animate-[capi-marquee_40s_linear_infinite]">
        {[0, 1, 2, 3, 4, 5].map((copy) => (
          <p key={copy} className="shrink-0 pr-[0.6em] text-[clamp(3.5rem,11vw,8rem)] leading-tight font-extrabold tracking-tight whitespace-nowrap text-primary">
            Sabendo, não torcendo.
          </p>
        ))}
      </div>
      <Container className="mt-12 lg:mt-16">
        <Reveal className="flex flex-col gap-10">
          <h2 id="preco-title" className="max-w-3xl text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-5xl">
            Ponha o Capi à prova por 5 dias.
          </h2>
          <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map(({ when, text }) => (
              <li key={when} className="flex flex-col gap-2 border-t border-foreground/20 pt-5">
                <p className="text-lg font-extrabold text-primary">{when}</p>
                <p className="text-lg text-pretty text-foreground/80">{text}</p>
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3">
            <SignUpLink className="w-full sm:w-fit">Começar meus 5 dias grátis</SignUpLink>
            <OfferTerms className="text-foreground/70" />
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

function Questions() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-title" className="scroll-mt-16 py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 id="duvidas-title" className="text-3xl font-extrabold tracking-tight text-balance text-primary sm:text-5xl">
          Perguntas frequentes
        </h2>
        <Faq />
      </Container>
    </section>
  )
}

function Closing() {
  return (
    <section aria-labelledby="fechamento-title" className="bg-capi-purple py-20 text-white lg:py-28">
      <Container>
        <Reveal className="flex max-w-4xl flex-col gap-6">
          <h2 id="fechamento-title" className="text-4xl font-extrabold tracking-tight text-balance sm:text-6xl">
            O mês vai fechar de qualquer jeito.
          </h2>
          <p className="text-xl text-pretty text-white/85 sm:text-2xl">
            A diferença é chegar lá sabendo.
          </p>
          <p className="max-w-2xl text-lg text-pretty text-white/85">
            Não podemos prometer que o seu mês vai fechar no azul. Podemos garantir que você vai saber antes.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <SignUpLink className="w-full bg-white text-capi-purple hover:bg-capi-lilac-light hover:shadow-black/30 focus-visible:ring-white/60 sm:w-fit" />
            <OfferTerms className="text-white/85" />
          </div>
          <p className="max-w-xl pt-4 text-base text-pretty text-white/85">
            <strong className="text-white">P.S.</strong> Leva poucos minutos: crie a conta, importe o extrato e veja o que
            vence nesta semana.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-capi-purple text-white max-lg:pb-20">
      <Container className="flex flex-col gap-6 border-t border-white/25 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo white />
        <Link href="/login" className="rounded text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-white/60">
          Já tem conta? Entrar
        </Link>
      </Container>
      <Container className="pb-8 text-sm text-white/80">© {new Date().getFullYear()} Capi Gestão</Container>
    </footer>
  )
}
