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
// Every [COPY], [IMAGEM], [DEPOIMENTO] and [MOCK] is a placeholder.
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
            [COPY] Para BPO financeiro e quem repassa dinheiro de clientes
          </p>
          <h1 id="hero-title" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            [COPY] Feche os repasses de todos os clientes em [prazo], sem planilha e sem erro de soma
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            [COPY] A Capi lê o extrato do banco e mostra <strong className="text-foreground">quanto você deve a cada cliente</strong>,
            para que você repasse o valor certo, no dia certo.
          </p>
          <EmailCta id="hero-email" />
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2" aria-hidden>
              {Array.from({ length: 4 }, (_, index) => (
                <AvatarPlaceholder key={index} className="size-9 bg-background ring-2 ring-background" showLabel={false} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">[COPY] [X] escritórios já fecham o mês com a Capi</p>
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
              [COPY] Conferência do mês
            </p>
            <p className="mt-1 text-sm text-muted-foreground">[COPY] Caixa e custódia batendo</p>
          </div>
        </div>
      </Container>
      <Container className="pb-14">
        <p className="text-center text-sm text-muted-foreground">[COPY] Empresas que já confiam na Capi</p>
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
        <SectionHeading id="depoimentos-title" eyebrow="[COPY] Depoimentos" title="[COPY] Quem trocou a planilha pela Capi não volta" />
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
                  [DEPOIMENTO: citação real do cliente, com o resultado que ele teve
                  {index % 2 === 0 ? " — de preferência com um antes e depois" : ""}]
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
    title: "[COPY] Uma planilha para cada cliente",
    text: "[COPY] Cada favorecido tem o seu arquivo. Achar um valor vira caça ao tesouro.",
  },
  {
    icon: Calculator,
    title: "[COPY] Soma feita na mão",
    text: "[COPY] Você copia o extrato, cola na planilha e confere linha por linha.",
  },
  {
    icon: EyeOff,
    title: "[COPY] Erro que ninguém vê",
    text: "[COPY] Uma fórmula quebrada não avisa. O saldo parece certo, mas não está.",
  },
]

function Problem() {
  return (
    <section aria-labelledby="problema-title" className="py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          id="problema-title"
          eyebrow="[COPY] O problema"
          title="[COPY] Controlar dinheiro de cliente em planilha cansa — e é arriscado"
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
  { lead: "[COPY] Repasse a mais.", text: "[COPY] Você paga do seu bolso e só descobre meses depois." },
  { lead: "[COPY] Cliente cobrando.", text: "[COPY] Ele pergunta o saldo e você precisa de um dia para responder." },
  { lead: "[COPY] Fechamento que vira noite.", text: "[COPY] Todo fim de mês, as mesmas horas conferindo planilha." },
  { lead: "[COPY] Dinheiro misturado.", text: "[COPY] Fica difícil saber o que é seu e o que é do cliente." },
]

function Agitate() {
  return (
    <section aria-labelledby="agitar-title" className="bg-foreground py-20 text-background">
      <Container className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 id="agitar-title" className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            [COPY] O erro não avisa. Ele aparece no repasse.
          </h2>
          <p className="text-lg text-background/70">
            [COPY] Planilha não foi feita para guardar dinheiro de terceiros. Quanto mais clientes, maior o risco.
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
            eyebrow="[COPY] A solução"
            title="[COPY] A Capi confere o seu caixa sozinha, todo dia"
            description="[COPY] Ela separa o dinheiro dos seus clientes do dinheiro da sua empresa. Se a conta não fechar, você fica sabendo na hora."
          />
          <ul className="flex flex-col gap-3">
            {[
              "[COPY] Saldo de cada cliente calculado a partir do extrato",
              "[COPY] Nada de digitar valor: tudo vem do banco",
              "[COPY] Aviso quando algo não bate",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <figure className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-brand/10 to-brand/0 p-6 ring-1 ring-brand/20 sm:p-8">
          <figcaption className="text-sm font-semibold text-brand-stronger">[COPY] Conferência de hoje</figcaption>
          <dl className="flex flex-col gap-3 font-mono text-sm sm:text-base">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-background px-4 py-3 ring-1 ring-foreground/10">
              <dt>[COPY] Saldo das suas contas</dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-background px-4 py-3 ring-1 ring-foreground/10">
              <dt className="flex items-center gap-2">
                <Minus className="size-4 text-muted-foreground" aria-label="menos" />
                [COPY] Dinheiro dos clientes
              </dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-brand-strong px-4 py-3 text-white">
              <dt>= [COPY] Dinheiro da sua empresa</dt>
              <dd className="font-semibold">R$ [valor]</dd>
            </div>
          </dl>
          <p className="flex items-center gap-2 text-sm font-medium text-brand-stronger">
            <CircleCheck className="size-4" aria-hidden />
            [COPY] Tudo certo: a conta fechou
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
    title: "[COPY] Importe o extrato",
    text: "[COPY] Baixe o OFX no seu banco e envie para a Capi.",
    image: "tela de importação de extrato OFX",
  },
  {
    icon: Link2,
    title: "[COPY] Concilie em poucos cliques",
    text: "[COPY] Ligue cada entrada à parcela certa. A Capi sugere o rateio.",
    image: "tela de conciliação ligando transação a parcelas",
  },
  {
    icon: Send,
    title: "[COPY] Repasse sem medo",
    text: "[COPY] Veja o saldo de cada cliente e repasse só o que é dele.",
    image: "tela de repasses com saldo por favorecido",
  },
]

function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona-title" className="bg-muted/50 py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="como-funciona-title" eyebrow="[COPY] Como funciona" title="[COPY] Do extrato ao repasse em 3 passos" />
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
    title: "[COPY] Divida cada recebimento entre vários clientes",
    text: "[COPY] Informe a parte de cada um, em percentual ou valor, para que ninguém receba a mais nem a menos.",
    image: "tela de destinação de um recebimento entre favorecidos",
  },
  {
    title: "[COPY] Responda o saldo do cliente na hora",
    text: "[COPY] O extrato de cada favorecido fica pronto, para que você responda em segundos, não em dias.",
    image: "extrato de razão de um favorecido com créditos e repasses",
  },
]

const BENEFITS = [
  { icon: FileUp, title: "[COPY] Extrato sem duplicar", text: "[COPY] Importe o mesmo arquivo duas vezes, para que nada se repita por engano." },
  { icon: Wallet, title: "[COPY] Repasse com trava", text: "[COPY] A Capi não deixa repassar acima do saldo, para que você não pague do seu bolso." },
  { icon: Split, title: "[COPY] Várias parcelas de uma vez", text: "[COPY] Uma entrada quita várias parcelas, para que a quitação antecipada não dê trabalho." },
  { icon: History, title: "[COPY] Histórico de tudo", text: "[COPY] Cada alteração fica registrada, para que você saiba quem fez o quê." },
  { icon: Users, title: "[COPY] Equipe com permissões", text: "[COPY] Cada pessoa vê só o que precisa, para que o controle fique com você." },
  { icon: ShieldCheck, title: "[COPY] Empresas separadas", text: "[COPY] Os dados de cada empresa ficam isolados, para que nada se misture." },
]

function Benefits() {
  return (
    <section aria-labelledby="beneficios-title" className="py-20">
      <Container className="flex flex-col gap-16">
        <SectionHeading id="beneficios-title" eyebrow="[COPY] Benefícios" title="[COPY] Menos conferência. Mais tempo para os seus clientes." />
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
  { feature: "[COPY] Saldo de cada cliente atualizado sozinho", sheet: "manual" },
  { feature: "[COPY] Importa o extrato do banco", sheet: "manual" },
  { feature: "[COPY] Avisa quando o caixa não bate", sheet: "no" },
  { feature: "[COPY] Divide um recebimento entre vários clientes", sheet: "manual" },
  { feature: "[COPY] Impede repasse acima do saldo", sheet: "no" },
  { feature: "[COPY] Mostra quem alterou o quê", sheet: "no" },
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
        <SectionHeading id="comparativo-title" eyebrow="[COPY] Comparativo" title="[COPY] Capi ou planilha?" />
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
  { icon: Briefcase, title: "[COPY] BPO financeiro", text: "[COPY] Recebe e repassa para vários clientes." },
  { icon: Building2, title: "[COPY] Imobiliárias", text: "[COPY] Aluguel recebido, repasse ao proprietário." },
  { icon: HardHat, title: "[COPY] Construtoras", text: "[COPY] Despesa de obra cobrada do cliente." },
  { icon: Scale, title: "[COPY] Escritórios de advocacia", text: "[COPY] Custas e valores de clientes." },
  { icon: Building, title: "[COPY] Administradoras de condomínio", text: "[COPY] Dinheiro do condomínio separado do seu." },
]

function Audience() {
  return (
    <section aria-labelledby="para-quem-title" className="py-20">
      <Container className="flex flex-col gap-12">
        <SectionHeading id="para-quem-title" eyebrow="[COPY] Para quem é" title="[COPY] Feita para quem cuida do dinheiro dos outros" />
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
          eyebrow="[COPY] Planos"
          title="[COPY] Comece grátis. Escolha o plano depois."
          description="[COPY] Todos os planos com [X] dias grátis, sem cartão de crédito."
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
          eyebrow="[COPY] Dúvidas"
          title="[COPY] Perguntas frequentes"
          description="[COPY] Não achou sua resposta? Fale com a gente em [CONTATO]."
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
          [COPY] Feche o próximo mês sem abrir uma planilha
        </h2>
        <p className="max-w-xl text-lg text-white/85">[COPY] Crie sua conta em [X] minutos e importe seu primeiro extrato hoje.</p>
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
          <p className="text-sm text-muted-foreground">[COPY] Gestão de recebimentos e repasses de terceiros.</p>
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
        © {new Date().getFullYear()} Capi. [COPY: razão social e CNPJ]
      </Container>
    </footer>
  )
}
