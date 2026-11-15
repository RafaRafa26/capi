import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Building2, CalendarClock, FileText, HandCoins, LogIn, Percent, Users } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CompanyCompare } from "./company-compare"
import { Faq } from "./faq"
import { BrowserFrame, Container, Logo, OfferTerms, ctaClassName } from "./primitives"
import { ReconcileDemo } from "./reconcile-demo"
import { Reveal } from "./reveal"
import { DesktopNav, MobileNav } from "./site-nav"
import { StickyCta } from "./sticky-cta"

// Public landing page, shown at / to visitors without a session. It follows
// the arc of a classic sales letter: two alike companies and one difference
// (hero, story), what makes the difference, the product shown rather than
// described, a hands-on demo, the offer, objections, and back to the story.
// Screenshots are the real app with a made-up company; prices are masked
// until the offer is defined. No testimonials or client numbers.
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
        <Link href="/" aria-label="Capi Gestão, página inicial" className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
          <Logo />
        </Link>
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
      <Container className="grid items-center gap-12 pt-12 pb-16 lg:grid-cols-[11fr_9fr] lg:gap-14 lg:pt-20 lg:pb-24">
        <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          <p className="w-fit rounded-full bg-background px-3.5 py-1.5 text-sm font-semibold text-primary ring-1 ring-capi-lilac/30">
            Gestão financeira de verdade
          </p>
          <h1 id="hero-title" className="text-[clamp(2.375rem,6.2vw,4.25rem)] leading-[1.04] font-extrabold tracking-tight text-balance">
            Duas empresas faturam o mesmo. <span className="text-primary">Só uma sabe se teve lucro.</span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-foreground/70 sm:text-xl">
            O Capi mostra o que vai entrar, o que vai sair e quanto do saldo é realmente seu, sem complicação.
          </p>
          <div className="flex flex-col gap-3">
            <SignUpLink id="hero-cta" className="w-full sm:w-fit" />
            <OfferTerms className="text-foreground/70" />
          </div>
        </div>
        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <CompanyCompare />
        </div>
      </Container>
    </section>
  )
}

function Story() {
  return (
    <section aria-labelledby="historia-title" className="py-20 lg:py-28">
      <Container className="flex flex-col gap-10">
        <Reveal className="flex max-w-3xl flex-col gap-4">
          <h2 id="historia-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Elas começaram iguais.
          </h2>
          <p className="text-lg text-pretty text-muted-foreground sm:text-xl">
            Imagine duas empresas abertas no mesmo ano, no mesmo bairro. Mesmo ramo, faturamento parecido, donos igualmente
            dedicados.
          </p>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="flex flex-col gap-3 rounded-3xl bg-muted p-6 sm:p-8">
            <p className="text-sm font-semibold text-muted-foreground">No dia 20, em uma delas</p>
            <p className="text-xl font-semibold text-pretty sm:text-2xl">
              O dono abre o aplicativo do banco, vê o saldo e faz a conta de cabeça.
            </p>
            <p className="text-lg text-muted-foreground">Vai descobrir no dia 30.</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-3 rounded-3xl bg-capi-lilac-light p-6 ring-1 ring-capi-lilac/30 sm:p-8">
            <p className="text-sm font-semibold text-primary">No dia 20, na outra</p>
            <p className="text-xl font-semibold text-pretty sm:text-2xl">
              O dono abre o computador e vê quanto ainda entra, quanto ainda sai e quanto sobra.
            </p>
            <p className="text-lg text-muted-foreground">Decide na hora se contrata, se compra ou se espera.</p>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

// The one color band: what separates the two companies, in big type.
function Difference() {
  return (
    <section aria-labelledby="diferenca-title" className="bg-capi-purple-dark py-24 text-white lg:py-36">
      <Container className="max-w-4xl">
        <Reveal className="flex flex-col gap-8">
          <h2 id="diferenca-title" className="text-lg font-semibold text-capi-lilac sm:text-xl">
            O que faz a diferença?
          </h2>
          <p className="text-2xl text-pretty text-white/70 sm:text-3xl">
            Não é trabalhar mais. Não é vender mais. Nem entender de contabilidade.
          </p>
          <p className="text-[clamp(2rem,6vw,3.75rem)] leading-[1.08] font-extrabold tracking-tight text-balance">
            É enxergar os próprios números <span className="text-capi-green">antes de precisar deles.</span>
          </p>
          <p className="text-xl text-white/85">O Capi existe para isso.</p>
        </Reveal>
      </Container>
    </section>
  )
}

const VIEWS = [
  {
    title: "O que vence nesta semana.",
    text: "Contas a pagar e a receber por vencimento, com as atrasadas em destaque. O aperto aparece no dia 5, não no dia 28.",
    src: "/landing/painel.png",
    width: 2200,
    height: 1280,
    alt: "Painel do Capi com saldo atual, pontos de atenção, fluxo de caixa e contas a receber e a pagar separadas em vencidas, vencem hoje e a vencer.",
  },
  {
    title: "O saldo que é seu de verdade.",
    text: "Importe o extrato do banco e confira lançamento por lançamento. Importou o mesmo arquivo duas vezes? Nada se repete.",
    src: "/landing/conciliacao.png",
    width: 2200,
    height: 1440,
    alt: "Tela de conciliação do Capi, com os lançamentos do banco à esquerda e os lançamentos do Capi à direita.",
  },
  {
    title: "Para onde o dinheiro foi.",
    text: "Receitas e despesas nas categorias que você define, com relatórios em PDF e Excel para levar ao sócio ou ao contador.",
    src: "/landing/contas-a-pagar.png",
    width: 2200,
    height: 1560,
    alt: "Lista de contas a pagar do Capi, com categoria, fornecedor, vencimento e situação de cada conta, e botão de exportar.",
  },
]

function Product() {
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-16 py-20 lg:py-28">
      <Container className="flex flex-col gap-16 lg:gap-24">
        <Reveal className="flex max-w-3xl flex-col gap-4">
          <h2 id="como-funciona-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Abra o Capi numa segunda-feira de manhã. <span className="text-primary">É isto que você vê.</span>
          </h2>
        </Reveal>
        {VIEWS.map(({ title, text, src, width, height, alt }, index) => (
          <Reveal key={title} className="grid items-center gap-8 lg:grid-cols-[2fr_3fr] lg:gap-14">
            <div className={cn("flex flex-col gap-4", index % 2 === 1 && "lg:order-2")}>
              <p className="flex size-10 items-center justify-center rounded-full bg-capi-lilac-light text-base font-bold text-primary" aria-hidden>
                {index + 1}
              </p>
              <h3 className="text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">{title}</h3>
              <p className="text-lg text-pretty text-muted-foreground">{text}</p>
            </div>
            <BrowserFrame>
              <Image src={src} width={width} height={height} alt={alt} sizes="(min-width: 1024px) 660px, 100vw" className="h-auto w-full" />
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
          <h2 id="demonstracao-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
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
    <section aria-labelledby="tambem-faz-title" className="py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <Reveal>
          <h2 id="tambem-faz-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
            E quando a sua operação pedir mais
          </h2>
        </Reveal>
        <Reveal>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {EXTRAS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex gap-3 border-t py-5 text-base font-medium text-pretty">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                {text}
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
    <section id="preco" aria-labelledby="preco-title" className="scroll-mt-16 px-4 sm:px-6">
      <Reveal className="mx-auto flex max-w-6xl flex-col gap-10 rounded-[2rem] bg-capi-purple-dark px-6 py-14 text-white sm:px-12 lg:py-20">
        <h2 id="preco-title" className="max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
          Ponha o Capi à prova por 5 dias.
        </h2>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map(({ when, text }) => (
            <li key={when} className="flex flex-col gap-2 border-t border-white/20 pt-5">
              <p className="text-lg font-bold text-capi-green">{when}</p>
              <p className="text-lg text-pretty text-white/85">{text}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3">
          <SignUpLink className="w-full bg-white text-capi-purple-dark hover:bg-capi-lilac-light hover:shadow-black/20 focus-visible:ring-white/60 sm:w-fit">
            Começar meus 5 dias grátis
          </SignUpLink>
          <OfferTerms className="text-white/75" />
        </div>
      </Reveal>
    </section>
  )
}

function Questions() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-title" className="scroll-mt-16 py-20 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 id="duvidas-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          Perguntas frequentes
        </h2>
        <Faq />
      </Container>
    </section>
  )
}

function Closing() {
  return (
    <section aria-labelledby="fechamento-title" className="bg-capi-lilac-light py-20 lg:py-28">
      <Container className="max-w-3xl">
        <Reveal className="flex flex-col items-center gap-6 text-center">
          <Image src="/brand/icon-192.png" alt="" width={96} height={96} className="size-20 rounded-3xl sm:size-24" />
          <h2 id="fechamento-title" className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Sobre aquelas duas empresas.
          </h2>
          <p className="text-xl text-pretty text-foreground/75 sm:text-2xl">
            Elas continuam parecidas. A diferença é que uma chega ao fim do mês sabendo, e a outra, torcendo.
          </p>
          <p className="text-lg text-pretty text-foreground/75">
            Não podemos prometer que o seu mês vai fechar no azul. Podemos garantir que você vai saber antes.
          </p>
          <div className="flex flex-col items-center gap-3 pt-2">
            <SignUpLink className="w-full sm:w-fit" />
            <OfferTerms className="justify-center text-foreground/70" />
          </div>
          <p className="max-w-xl pt-4 text-base text-pretty text-foreground/75">
            <strong className="text-foreground">P.S.</strong> Leva poucos minutos: crie a conta, importe o extrato e veja o
            que vence nesta semana.
          </p>
        </Reveal>
      </Container>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t max-lg:pb-20">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <Logo />
        <Link href="/login" className="text-sm text-foreground underline-offset-4 hover:underline">
          Já tem conta? Entrar
        </Link>
      </Container>
      <Container className="border-t py-6 text-sm text-muted-foreground">© {new Date().getFullYear()} Capi Gestão</Container>
    </footer>
  )
}
