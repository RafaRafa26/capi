# Progresso — Implementação do Figma (CAPI ERP)

> Documento vivo. Cada etapa é feita em branch própria, revisada e mergeada em `main`.
> Ver `ARQUITETURA.md` para o domínio, as regras de negócio e as fases de backend.

Figma: https://www.figma.com/design/2ARHb2wiyftGJRozSS2LKp/CAPI---ERP

## Abordagem

Este ciclo cobre a **camada de interface** (telas do Figma, componentes shadcn/ui),
por etapas, uma branch de feature por etapa, mergeada em `main` ao final. A
integração com backend (Prisma, RLS, autenticação real, regras de negócio dos
serviços) segue as fases descritas em `ARQUITETURA.md` §10 e é tratada em
etapas futuras — as telas abaixo consomem dados mockados até lá.

## Mapa de navegação adotado

A sidebar (`src/components/nav-data.ts`) organiza as 17 telas do Figma assim:

- **Visão geral** → `/dashboard`
- **Financeiro**
  - **Contas e Extratos** → Contas bancárias (`/contas-bancarias`), Categorias
    (`/categorias`), Centros de custo (`/centros-de-custo`)
  - **Conciliação** → Conciliação bancária (`/conciliacao`), Contas a receber
    (`/contas-a-receber`), Repasses (`/repasses`)
- **Contatos** → Favorecidos, Fornecedores, Clientes (`/contatos`, filtrado por papel)
- **Configurações** → `/configuracoes`

## Etapas

| # | Etapa | Branch | Status |
|---|-------|--------|--------|
| 1 | Fundação: shadcn/ui manual (registry `new-york-v4`), design tokens do Figma, `AppSidebar`, layout `(app)`, tela de login, dashboard (Visão geral) | `feature/shadcn-foundation` | ✅ Concluída |
| 2 | Contatos: listagem, criar/editar, detalhe | `feature/contatos` | ⏳ Próxima |
| 3 | Contas bancárias, categorias, centros de custo, extrato | `feature/contas-bancarias` | ⏳ Planejada |
| 4 | Contas a receber + novo recebimento (avulso e v3) | `feature/contas-a-receber` | ⏳ Planejada |
| 5 | Conciliação (lista completa + empty state) | `feature/conciliacao` | ⏳ Planejada |
| 6 | Repasses (saldo por favorecido) | `feature/repasses` | ⏳ Planejada |

## Telas do Figma (inventário completo, 17 frames)

- [x] `login-capi` (455:569) → `/login`
- [x] `visao-geral-dashboard` (460:769) + `-sidebar-collapsed` (486:606) → `/dashboard`
- [ ] `contatos-listagem` (468:666)
- [ ] `contato-criar-editar` (469:893)
- [ ] `contato-detalhe` (471:682)
- [ ] `contas-bancarias-listagem` (473:652)
- [ ] `conta-bancaria-criar-editar` (474:666)
- [ ] `categorias-gestao` (474:1123)
- [ ] `centros-de-custo-listagem` (477:779)
- [ ] `extrato-conta-bancaria` (477:1121)
- [ ] `contas-a-receber-listagem` (478:1000)
- [ ] `novo-recebimento-avulso` (480:1775)
- [ ] `novo-recebimento-v3` (400:351)
- [ ] `conciliacao-lista-completa` (320:908)
- [ ] `conciliacao-empty-state` (525:585)
- [ ] `03 / Repasses — saldo por favorecido` (271:394)

## Etapa 1 — Fundação (detalhe)

**Por que shadcn manual, não a CLI:** o proxy de rede deste ambiente bloqueia
`ui.shadcn.com` (usado pelo `shadcn init`/`add`). `registry.npmjs.org` e
`raw.githubusercontent.com` estão liberados, então os componentes foram
copiados diretamente do registry público `new-york-v4` do shadcn-ui/ui no
GitHub e adaptados aos aliases do projeto (`@/components/ui`, `@/lib/utils`,
`@/hooks`). Resultado idêntico ao que `shadcn add` geraria.

**O que foi feito:**
- Dependências: `radix-ui` (pacote unificado), `class-variance-authority`,
  `clsx`, `tailwind-merge`, `lucide-react`, `next-themes`, `sonner`,
  `tw-animate-css`.
- `tsconfig.json`: alias `@/*` corrigido para `./src/*` (ficou desatualizado
  após o app ter sido movido para `src/` no commit anterior).
- `src/app/globals.css`: tokens de design (cores, radius) extraídos do Figma
  via `get_design_context` — batem exatamente com a paleta "neutral" padrão
  do shadcn (`--primary: oklch(0.205 0 0)` ≈ `#171717`, `--border` ≈ `#e5e5e5`).
- Componentes shadcn instalados: button, input, label, card, alert,
  alert-dialog, separator, badge, table, dialog, sheet, dropdown-menu,
  avatar, tabs, select, checkbox, textarea, popover, tooltip, sidebar,
  breadcrumb, skeleton, scroll-area, switch, radio-group, sonner, collapsible.
- `src/components/app-sidebar.tsx` + `src/components/nav-data.ts`: sidebar
  fiel ao Figma (`variant="floating"`, header com nome/CNPJ da organização,
  grupos colapsáveis, rodapé com usuário).
- `/login`: painel hero + formulário, fiel ao node `login-capi`.
- `/dashboard`: cards de contas bancárias, fluxo de caixa (gráfico de linha
  em SVG, com marcador "hoje" e trecho projetado tracejado), contas a
  receber/pagar e recebimentos por mês (gráfico de barras) — dados mockados.
- Ícones dos itens de menu foram trocados dos placeholders genéricos do kit
  Figma (`frame`, `bot`, `terminal`) por ícones lucide semanticamente
  corretos (`LayoutDashboard`, `Landmark`, `ArrowLeftRight`, `Users`, etc.).

**Validado com:** `next build`, `eslint .` e captura de tela via Playwright
comparada ao Figma (login e dashboard visualmente equivalentes).

**Pendências conhecidas:** autenticação real (Fase 1 de `ARQUITETURA.md`),
Prisma/RLS, dados reais em vez de mock — fora do escopo desta etapa de UI.
