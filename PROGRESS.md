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
| 2 | Contatos: listagem, criar/editar, detalhe | `feature/contatos` | ✅ Concluída |
| 3 | Contas bancárias, categorias, centros de custo, extrato | `feature/contas-bancarias` | ✅ Concluída |
| 4 | Contas a receber + novo recebimento (avulso e v3) | `feature/contas-a-receber` | ✅ Concluída |
| 5 | Conciliação (lista completa + empty state) | `feature/conciliacao` | ✅ Concluída |
| 6 | Repasses (saldo por favorecido) | `feature/repasses` | ✅ Concluída |

## Telas do Figma (inventário completo, 17 frames)

- [x] `login-capi` (455:569) → `/login`
- [x] `visao-geral-dashboard` (460:769) + `-sidebar-collapsed` (486:606) → `/dashboard`
- [x] `contatos-listagem` (468:666) → `/contatos`
- [x] `contato-criar-editar` (469:893) → `/contatos/novo`, `/contatos/[id]/editar`
- [x] `contato-detalhe` (471:682) → `/contatos/[id]`
- [x] `contas-bancarias-listagem` (473:652) → `/contas-bancarias`
- [x] `conta-bancaria-criar-editar` (474:666) → `/contas-bancarias/novo`, `/contas-bancarias/[id]/editar`
- [x] `categorias-gestao` (474:1123) → `/categorias`
- [x] `centros-de-custo-listagem` (477:779) → `/centros-de-custo`
- [x] `extrato-conta-bancaria` (477:1121) → `/contas-bancarias/[id]/extrato`
- [x] `contas-a-receber-listagem` (478:1000) → `/contas-a-receber`
- [x] `novo-recebimento-avulso` (480:1775) → `/contas-a-receber/novo` (aba Avulsa)
- [x] `novo-recebimento-v3` (400:351) → `/contas-a-receber/novo` (aba Contrato)
- [x] `conciliacao-lista-completa` (320:908) → `/conciliacao`
- [x] `conciliacao-empty-state` (525:585) → `/conciliacao` (estado sem pendências)
- [x] `03 / Repasses — saldo por favorecido` (271:394) → `/repasses`

**As 17 telas do Figma estão implementadas.** Próximo ciclo: integrar
com backend real (Prisma, RLS, autenticação, serviços) seguindo as
fases de `ARQUITETURA.md` §10, substituindo os dados mockados em
`src/lib/mock-data/`.

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

## Etapa 2 — Contatos (detalhe)

**O que foi feito:**
- `src/lib/mock-data/contatos.ts`: tipos `Contato`, `TipoPessoa`,
  `PapelContato`, `SituacaoContato` alinhados à entidade `Contato` de
  `ARQUITETURA.md` §5.1, com 10 registros mockados.
- `/contatos`: tabela client-side (`ContatosTable`) com busca por nome,
  filtro por papel e por situação, badges de papéis/situação e menu de
  ações (ver detalhes / editar) por linha.
- `/contatos/novo` e `/contatos/[id]/editar`: formulário único
  (`ContatoForm`) com as 5 seções do Figma — Identificação, Papéis,
  Contato, Dados bancários, PIX — reaproveitado entre criar e editar.
  O rótulo "Cliente" do checkbox mapeia para o papel `PAGADOR` do
  domínio (mesmo mapeamento usado no item "Clientes" da sidebar).
- `/contatos/[id]`: ficha somente-leitura com breadcrumb, badges de
  papel/situação, botões Editar/Inativar e os dados cadastrais em grid.
- Sem persistência: "Salvar" dispara um toast (sonner) e navega de
  volta — a gravação real entra quando a Fase 1/2 de `ARQUITETURA.md`
  (Prisma, serviços, RLS) for implementada.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright comparada ao Figma nas três telas (listagem, formulário,
detalhe) — visualmente equivalentes.

## Etapa 3 — Contas e Extratos (detalhe)

**O que foi feito:**
- `src/lib/mock-data/{contas-bancarias,categorias,centros-de-custo,extrato}.ts`
  e `src/lib/format.ts` (`formatMoney`, valores sempre em centavos,
  conforme AD-07).
- `/contas-bancarias`: tabela com badges de natureza (Própria/Terceiro)
  e situação (Ativa/Inativa), busca por nome ou banco.
- `/contas-bancarias/novo` e `.../[id]/editar`: formulário de 4 seções
  — Dados da conta, Natureza (cartões de rádio Própria/Terceiro com a
  descrição de cada uma), Saldo inicial, Situação (switch).
- `/contas-bancarias/[id]/extrato`: seletor de conta (troca de conta
  navega para a rota do id selecionado), período, cards de saldo
  inicial/final e tabela de lançamentos com entrada/saída/saldo.
- `/categorias`: árvore categoria → subcategorias com abas Todas
  /Receitas/Despesas, linhas colapsáveis e diálogo "Nova categoria".
- `/centros-de-custo`: listagem com busca e diálogo "Novo centro de
  custo".
- Categorias e centros de custo não têm tela dedicada de criação no
  Figma (apenas um botão) — implementados como `Dialog` do shadcn,
  entrada mínima (nome e, para categoria, tipo) somada à lista local
  via `useState` para dar feedback imediato nesta etapa de UI.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright das cinco telas comparada ao Figma — visualmente
equivalentes.

## Etapa 4 — Contas a receber (detalhe)

**Decisão de escopo:** os frames `novo-recebimento-avulso` e
`novo-recebimento-v3` do Figma são o mesmo formulário "Nova venda" em
dois estados de aba (Avulsa / Contrato), não duas telas distintas —
mesma sidebar, mesmo layout de colunas, mesma seção de Repasse.
Implementados como uma única rota (`/contas-a-receber/novo`) com
`Tabs`, em vez de duplicar componente e lógica.

**O que foi feito:**
- `src/lib/mock-data/lancamentos.ts`: tipo `LancamentoRecebimento`
  alinhado ao `Lancamento` (tipo `RECEBIMENTO`) de `ARQUITETURA.md`
  §5.1, com situação derivada (`VENCIDO`/`VENCE_HOJE`/`A_VENCER`
  /`RECEBIDO`) para a UI — o enum real de status (`PREVISTO`
  /`PARCIAL`/`LIQUIDADO`/`CANCELADO`) entra com os serviços da Fase 4.
- `/contas-a-receber`: cards de resumo, abas por situação, busca e
  tabela com checkbox de seleção (preparado para ações em lote quando
  a Fase 7 — repasses — existir).
- `/contas-a-receber/novo`: formulário com painel "Resumo" ao vivo.
  A seção **Repasse** implementa o rateio percentual da RN-04 —
  cada linha soma favorecido + percentual, o valor é calculado a
  partir do total (venda avulsa ou contrato), e o rodapé "Total: X%"
  fica verde só em 100%, replicando a validação que RN-04/RN-05
  exigem no domínio ("a soma das linhas deve corresponder a 100%").
  Na aba Contrato, parcelas/periodicidade/datas são calculadas ao
  vivo e refletidas em "Próximas parcelas".
- Sem persistência real: "Salvar" mostra um toast e volta para a
  listagem.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright da listagem e das duas abas do formulário — incluindo o
preenchimento do rateio para conferir visualmente o cálculo (total,
parcelas, datas e percentuais) antes de reportar a etapa concluída.

## Etapa 5 — Conciliação (detalhe)

**Decisão de escopo:** `conciliacao-empty-state` é o mesmo frame
`conciliacao-lista-completa` sem itens pendentes (mesma sidebar,
cabeçalho, abas e legenda — só a área da lista muda). Implementado
como o estado vazio de `/conciliacao`, não como rota própria.

**O que foi feito:**
- `src/lib/mock-data/conciliacao.ts`: `ItemConciliacao` com o lado do
  extrato (`TransacaoOfx`) e, opcionalmente, o lançamento já casado
  (`LancamentoCandidato`); quando não há match, o item carrega um
  `criarTipoSugerido` (Pagamento ou Transferência).
- Cada linha reproduz a coluna dupla do Figma — extrato à esquerda,
  lançamento à direita — com os ícones de entrada/saída e os botões
  Conciliar/Buscar outro lançamento.
- Linhas sem correspondência viram um formulário inline de criação,
  cobrindo os dois casos do Fase 8 de `ARQUITETURA.md`: **Pagamento**
  (contato + categoria) e **Transferência** (apenas a conta de
  destino — RN-15, o valor já vem da transação bancária).
- "Conciliar" remove o item da lista pendente (estado local) e exibe
  um toast; ao zerar a lista, aparece o estado vazio do segundo frame.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright da lista preenchida e, clicando "Conciliar" em todas as
linhas, do estado vazio — confirmando visualmente as duas variações
do frame do Figma.

## Etapa 6 — Repasses (detalhe)

**O que foi feito:**
- `src/lib/mock-data/repasses.ts`: `FavorecidoRepasse` com saldo
  disponível, pendente e realizado por favorecido (RN-09).
- `/repasses`: cards de totais, abas Todos/Com saldo/Sem saldo, filtro
  por período e busca, tabela com os três saldos por favorecido.
- Botão "Gerar repasse" abre um `Dialog` que valida o valor contra o
  saldo disponível **em tempo real** — implementa a RN-10 de verdade,
  não só visualmente: campo e botão de confirmação ficam desabilitados
  ao exceder o saldo, com a mensagem de erro. A ação da linha já nasce
  desabilitada para favorecidos com saldo zero.
- "Extrato" por favorecido é um placeholder (toast) — não existe frame
  dedicado no Figma; entra na Fase 9 de `ARQUITETURA.md` junto com o
  extrato de custódia real.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright da listagem e do diálogo de repasse preenchido com um
valor acima do saldo disponível, confirmando que a validação e o
bloqueio do botão aparecem corretamente.

---

Com esta etapa, as 17 telas do arquivo Figma têm implementação de UI
completa em `main`, todas com `next build`/`eslint` limpos e
conferência visual contra o Figma via captura de tela.
