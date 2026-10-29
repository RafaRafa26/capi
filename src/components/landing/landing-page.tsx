import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Check,
  CircleCheck,
  EyeOff,
  FileSpreadsheet,
  FileUp,
  HardHat,
  History,
  Link2,
  Minus,
  Quote,
  Scale,
  Send,
  ShieldCheck,
  Split,
  Users,
  Wallet,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import { EmailCta } from "./email-cta"
import { Faq } from "./faq"
import { Pricing } from "./pricing"
import { AvatarPlaceholder, BrowserFrame, Container, ImagePlaceholder, Logo, SectionHeading, ctaClassName } from "./primitives"

// Public landing page, shown at / to visitors without a session. One action
// only — start the free trial — repeated down the page; no navigation menu.
// All copy is lorem ipsum for now; [IMAGEM], [LOGO], [VÍDEO], [NOME COMPLETO]
// and [MOCK] mark the remaining placeholders.
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
        <WallOfLove />
        <Problem />
        <Agitate />
        <Mechanism />
        <HowItWorks />
        <Benefits />
        <Comparison />
        <Audience />
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
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <Button nativeButton={false} render={<Link href="/signup" />} className={`${ctaClassName} h-10 px-4 text-sm`}>
          Testar grátis
        </Button>
      </Container>
    </header>
  )
}

// 1. Hero — [result] + [time frame] + [without the fear], one action, proof.
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
      <Container className="grid items-center gap-12 pt-10 pb-12 lg:grid-cols-12 lg:gap-10 lg:pt-14 lg:pb-14">
        <div className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 lg:col-span-6">
          <p className="w-fit rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand-stronger">
            In reprehenderit voluptate velit esse cillum fugiat nulla pariatur
          </p>
          <h1 id="hero-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Lorem ipsum dolor sit amet consectetur adipiscing elit sed <strong className="text-foreground">do eiusmod tempor incididunt</strong>,
            ut labore et dolore magna aliqua enim ad minim.
          </p>
          <EmailCta id="hero-email" />
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden>
              {Array.from({ length: 4 }, (_, index) => (
                <AvatarPlaceholder key={index} className="size-9 bg-background ring-2 ring-background" showLabel={false} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Do eiusmod tempor incididunt ut labore et dolore magna</p>
          </div>
        </div>
        <div className="relative lg:col-span-6">
          <BrowserFrame>
            <ImagePlaceholder
              className="aspect-[16/10] rounded-none border-0 bg-brand/5"
              description="print do painel de repasses — saldo disponível de cada favorecido, repasses pendentes e realizados"
            />
          </BrowserFrame>
          <div className="absolute -bottom-6 -left-4 hidden w-64 rounded-xl bg-background p-4 shadow-xl ring-1 ring-foreground/10 sm:block">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <CircleCheck className="size-4 text-brand-strong" aria-hidden />
              Aliqua enim ad
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Minim veniam quis nostrud</p>
          </div>
        </div>
      </Container>
      <Container className="pb-14">
        <p className="text-center text-sm text-muted-foreground">Exercitation ullamco laboris nisi aliquip ex</p>
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} className={index === 4 ? "hidden sm:block" : undefined}>
              <ImagePlaceholder label="LOGO" description="cliente" className="h-12 rounded-lg p-2 text-xs" />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 2. Wall of love — volume of verifiable proof right below the hero.
function WallOfLove() {
  return (
    <section aria-labelledby="depoimentos-title" className="bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="depoimentos-title" eyebrow="Exercitation" title="Ullamco laboris nisi aliquip ex ea commodo consequat" />
        <ul className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>li]:mb-6 [&>li]:break-inside-avoid">
          <li>
            <ImagePlaceholder
              label="VÍDEO"
              description="depoimento em vídeo de cliente real, com legenda"
              className="aspect-video bg-background"
            />
          </li>
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index}>
              <figure className="flex flex-col gap-4 rounded-2xl bg-background p-6 ring-1 ring-foreground/10">
                <Quote className="size-5 text-brand" aria-hidden />
                <blockquote className="text-pretty">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
                  {index % 2 === 0 ? " et dolore magna aliqua, ut enim ad minim veniam quis nostrud." : "."}
                </blockquote>
                <figcaption className="flex items-center gap-3">
                  <AvatarPlaceholder />
                  <span className="flex flex-col text-sm">
                    <span className="font-semibold">[NOME COMPLETO]</span>
                    <span className="text-muted-foreground">[CARGO], [EMPRESA]</span>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 3. Problem — name the pain the visitor lives with today.
const PAINS = [
  {
    icon: FileSpreadsheet,
    title: "Duis aute irure in reprehenderit",
    text: "Voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident.",
  },
  {
    icon: Calculator,
    title: "Sunt culpa qui officia",
    text: "Deserunt mollit anim id est laborum lorem ipsum dolor sit amet consectetur.",
  },
  {
    icon: EyeOff,
    title: "Adipiscing elit sed do",
    text: "Eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim.",
  },
]

function Problem() {
  return (
    <section aria-labelledby="problema-title" className="py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="problema-title"
          eyebrow="Veniam quis"
          title="Nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat"
        />
        <ul className="grid gap-6 md:grid-cols-3">
          {PAINS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3 rounded-2xl p-6 ring-1 ring-foreground/10">
              <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 4. Agitate — why the old way keeps failing.
const CONSEQUENCES = [
  { lead: "Duis aute irure.", text: "In reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur." },
  { lead: "Sint occaecat.", text: "Cupidatat non proident sunt culpa qui officia deserunt mollit anim id est." },
  { lead: "Laborum lorem ipsum dolor.", text: "Sit amet consectetur adipiscing elit sed do eiusmod tempor." },
  { lead: "Incididunt ut.", text: "Labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco." },
]

function Agitate() {
  return (
    <section aria-labelledby="agitar-title" className="bg-foreground py-20 text-background">
      <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 id="agitar-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Ea commodo consequat duis aute irure in reprehenderit.
          </h2>
          <p className="text-lg text-background/70">
            Voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa.
          </p>
        </div>
        <ul className="flex flex-col gap-5">
          {CONSEQUENCES.map(({ lead, text }) => (
            <li key={lead} className="flex gap-3">
              <X className="mt-1 size-5 shrink-0 text-red-300" aria-hidden />
              <p className="text-background/80">
                <strong className="text-background">{lead}</strong> {text}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 5. Solve — the unique mechanism: cash × custody reconciliation.
function Mechanism() {
  return (
    <section aria-labelledby="solucao-title" className="py-20">
      <Container className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <SectionHeading
            id="solucao-title"
            align="left"
            eyebrow="Laboris nisi"
            title="Aliquip ex ea commodo consequat duis aute irure in"
            description="Reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id."
          />
          <ul className="flex flex-col gap-3">
            {[
              "Est laborum lorem ipsum dolor sit amet consectetur adipiscing",
              "Elit sed do eiusmod tempor incididunt ut labore",
              "Et dolore magna aliqua enim",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <figure className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/0 p-6 ring-1 ring-brand/20 sm:p-8">
          <figcaption className="text-sm font-semibold text-brand-stronger">Qui officia deserunt</figcaption>
          <dl className="flex flex-col gap-3 font-mono text-sm sm:text-base">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-background px-4 py-3 ring-1 ring-foreground/10">
              <dt>Mollit anim id est</dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-background px-4 py-3 ring-1 ring-foreground/10">
              <dt className="flex items-center gap-2">
                <Minus className="size-4 text-muted-foreground" aria-label="menos" />
                Laborum lorem ipsum
              </dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-brand-strong px-4 py-3 text-white">
              <dt>= Dolor sit amet consectetur</dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
          </dl>
          <p className="flex items-center gap-2 text-sm font-medium text-brand-stronger">
            <CircleCheck className="size-4" aria-hidden />
            Adipiscing elit sed do eiusmod
          </p>
        </figure>
      </Container>
    </section>
  )
}

// 6. How it works — three steps, each with its screenshot.
const STEPS = [
  {
    icon: FileUp,
    title: "Ad minim veniam",
    text: "Quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat.",
    image: "tela de importação de extrato OFX",
  },
  {
    icon: Link2,
    title: "Duis aute irure in",
    text: "Reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat.",
    image: "tela de conciliação ligando transação a parcelas",
  },
  {
    icon: Send,
    title: "Cupidatat non proident",
    text: "Sunt culpa qui officia deserunt mollit anim id est laborum lorem ipsum dolor.",
    image: "tela de repasses com saldo por favorecido",
  },
]

function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona-title" className="bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="como-funciona-title" eyebrow="Sit amet" title="Consectetur adipiscing elit sed do eiusmod tempor" />
        <ol className="grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text, image }, index) => (
            <li key={title} className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-strong text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <Icon className="size-5 text-brand-strong" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-muted-foreground">{text}</p>
              <ImagePlaceholder description={image} className="aspect-[4/3] bg-background" />
            </li>
          ))}
        </ol>
        <div className="flex justify-center">
          <Button nativeButton={false} render={<Link href="/signup" />} className={ctaClassName}>
            Testar grátis
            <ArrowRight aria-hidden />
          </Button>
        </div>
      </Container>
    </section>
  )
}

// 7. Benefits — feature, "so that" outcome.
const FEATURE_BLOCKS = [
  {
    title: "Incididunt ut labore et dolore magna",
    text: "Aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure.",
    image: "tela de destinação de um recebimento entre favorecidos",
  },
  {
    title: "In reprehenderit voluptate velit esse cillum fugiat",
    text: "Nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id.",
    image: "extrato de razão de um favorecido com créditos e repasses",
  },
]

const BENEFITS = [
  { icon: FileUp, title: "Est laborum lorem", text: "Ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut." },
  { icon: Wallet, title: "Labore et dolore", text: "Magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo." },
  { icon: Split, title: "Consequat duis aute irure in", text: "Reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non." },
  { icon: History, title: "Proident sunt culpa", text: "Qui officia deserunt mollit anim id est laborum lorem ipsum dolor sit." },
  { icon: Users, title: "Amet consectetur adipiscing", text: "Elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad." },
  { icon: ShieldCheck, title: "Minim veniam", text: "Quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis." },
]

function Benefits() {
  return (
    <section aria-labelledby="beneficios-title" className="py-20">
      <Container className="flex flex-col gap-16">
        <SectionHeading id="beneficios-title" eyebrow="Aute" title="Irure in reprehenderit voluptate velit esse cillum fugiat." />
        {FEATURE_BLOCKS.map(({ title, text, image }, index) => (
          <div key={title} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
            <div className={index % 2 === 1 ? "lg:order-last" : undefined}>
              <h3 className="text-2xl font-bold tracking-tight text-balance">{title}</h3>
              <p className="mt-3 text-lg text-muted-foreground">{text}</p>
            </div>
            <BrowserFrame>
              <ImagePlaceholder description={image} className="aspect-[16/10] rounded-none border-0" />
            </BrowserFrame>
          </div>
        ))}
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand-strong">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 8. Comparison — against the real alternative: the spreadsheet.
type Support = "yes" | "no" | "manual"

const COMPARISON: { feature: string; sheet: Support }[] = [
  { feature: "Nulla pariatur excepteur sint occaecat cupidatat", sheet: "manual" },
  { feature: "Non proident sunt culpa qui", sheet: "manual" },
  { feature: "Officia deserunt mollit anim id est", sheet: "no" },
  { feature: "Laborum lorem ipsum dolor sit amet", sheet: "manual" },
  { feature: "Consectetur adipiscing elit sed do", sheet: "no" },
  { feature: "Eiusmod tempor incididunt ut labore", sheet: "no" },
]

function SupportCell({ value }: { value: Support }) {
  if (value === "yes")
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-brand-stronger">
        <Check className="size-4" aria-hidden />
        Sim
      </span>
    )
  if (value === "manual") return <span className="text-muted-foreground">Na mão</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <X className="size-4" aria-hidden />
      Não
    </span>
  )
}

function Comparison() {
  return (
    <section aria-labelledby="comparativo-title" className="bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="comparativo-title" eyebrow="Et" title="Dolore magna aliqua?" />
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10">
          <table className="w-full text-left text-sm sm:text-base">
            <caption className="sr-only">Comparativo entre a Capi e a planilha</caption>
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-6">
                  <span className="sr-only">Recurso</span>
                </th>
                <th scope="col" className="w-24 px-4 py-3 font-semibold sm:w-32 sm:px-6">
                  Planilha
                </th>
                <th scope="col" className="w-24 bg-brand/10 px-4 py-3 font-semibold text-brand-stronger sm:w-32 sm:px-6">
                  Capi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {COMPARISON.map(({ feature, sheet }) => (
                <tr key={feature}>
                  <th scope="row" className="px-4 py-4 font-normal sm:px-6">
                    {feature}
                  </th>
                  <td className="px-4 py-4 sm:px-6">
                    <SupportCell value={sheet} />
                  </td>
                  <td className="bg-brand/5 px-4 py-4 sm:px-6">
                    <SupportCell value="yes" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  )
}

// 9. Audience — let each segment recognize itself.
const AUDIENCES = [
  { icon: Briefcase, title: "Enim ad", text: "Minim veniam quis nostrud exercitation ullamco." },
  { icon: Building2, title: "Laboris", text: "Nisi aliquip ex ea commodo." },
  { icon: HardHat, title: "Consequat", text: "Duis aute irure in reprehenderit voluptate." },
  { icon: Scale, title: "Velit esse cillum", text: "Fugiat nulla pariatur excepteur sint." },
  { icon: Building, title: "Occaecat cupidatat non", text: "Proident sunt culpa qui officia deserunt." },
]

function Audience() {
  return (
    <section aria-labelledby="para-quem-title" className="py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="para-quem-title" eyebrow="Mollit anim id" title="Est laborum lorem ipsum dolor sit amet consectetur" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AUDIENCES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-2xl p-5 ring-1 ring-foreground/10">
              <Icon className="size-6 text-brand-strong" aria-hidden />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}

// 10. Plans — [MOCK] values for now.
function Plans() {
  return (
    <section aria-labelledby="planos-title" className="bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="planos-title"
          eyebrow="Adipiscing"
          title="Elit sed do eiusmod tempor incididunt."
          description="Ut labore et dolore magna aliqua enim ad minim veniam quis."
        />
        <Pricing />
      </Container>
    </section>
  )
}

// 11. FAQ — the last objections, right before the closing CTA.
function Questions() {
  return (
    <section aria-labelledby="faq-title" className="py-20">
      <Container className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <SectionHeading
          id="faq-title"
          align="left"
          eyebrow="Nostrud"
          title="Exercitation ullamco"
          description="Laboris nisi aliquip ex ea commodo consequat duis aute irure."
        />
        <Faq />
      </Container>
    </section>
  )
}

// 12. Closing CTA — the same action, once more, with risk reversal.
function FinalCta() {
  return (
    <section aria-labelledby="cta-final-title" className="px-4 pb-20 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 overflow-hidden rounded-3xl bg-[radial-gradient(120%_120%_at_50%_0%,var(--color-brand-strong),var(--color-brand-stronger))] px-6 py-16 text-center text-white sm:px-12">
        <h2 id="cta-final-title" className="max-w-2xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Tempor incididunt ut labore et dolore magna aliqua
        </h2>
        <p className="max-w-xl text-lg text-white/85">Enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex.</p>
        <EmailCta id="final-email" tone="brand" className="items-center" />
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
          <p className="text-sm text-muted-foreground">Ea commodo consequat duis aute irure in.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            Já tem conta? Entrar
          </Link>
          <span className="text-muted-foreground">Lorem ipsum</span>
          <span className="text-muted-foreground">Dolor sit amet</span>
        </nav>
      </Container>
      <Container className="border-t py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} Capi. Lorem ipsum dolor sit amet.
      </Container>
    </footer>
  )
}
