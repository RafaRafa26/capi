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
| 7 | Sidebar: adoção do bloco shadcn `sidebar-07` | `feature/sidebar-07-block` | ✅ Concluída |
| 8 | Dashboard: gráfico de fluxo de caixa interativo (recharts) + filtro por período | `feature/dashboard-chart-daterange` | ✅ Concluída |

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

## Etapa 7 — Bloco shadcn `sidebar-07`

A pedido do usuário, a sidebar (que já tinha sido construída à mão na
Etapa 1, replicando o Figma) foi refeita em cima do bloco oficial
`sidebar-07` do shadcn/ui ("a sidebar that collapses to icons"),
instalado manualmente pelo mesmo motivo das demais etapas (registry
bloqueado pelo proxy — ver Etapa 1).

**O que mudou:**
- `src/components/team-switcher.tsx`, `nav-main.tsx`, `nav-projects.tsx`,
  `nav-user.tsx`: os quatro componentes do bloco, cada um adaptado ao
  domínio (organização em vez de "team/plano", ações reais em vez das
  fabricadas pelo bloco de exemplo — ver detalhe no commit
  `refactor(sidebar): adota a estrutura do bloco shadcn sidebar-07`).
- `app-sidebar.tsx`: agora só compõe esses quatro componentes; a
  ordem de navegação do Figma (Visão geral, Financeiro, Contatos,
  Configurações) foi preservada.
- `/dashboard`: adota o cabeçalho padrão do bloco — `SidebarTrigger` +
  `Separator` vertical + `Breadcrumb` — no lugar do título solto.
  As demais telas continuam com o cabeçalho anterior; portar esse
  padrão para elas é trabalho futuro, se for o caso.

**Comportamento validado visualmente:** dropdown do seletor de
organização, menu do usuário, ação "Novo contato" ao passar o mouse
sobre um item de Contatos, e o modo colapsado (ícones) da sidebar.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright dos estados acima.

## Etapa 8 — Gráfico de fluxo de caixa interativo + filtro por período

A pedido do usuário, o gráfico de linha em SVG do card "Fluxo de
caixa" (Etapa 1) foi substituído pelo padrão `chart-line-interactive`
do shadcn/ui (recharts), e ganhou um seletor de período (date range
picker) que filtra os dados exibidos.

**Componentes shadcn instalados** (mesmo motivo de sempre — registry
bloqueado, copiados manualmente): `chart` (`ChartContainer`,
`ChartTooltip`, `ChartTooltipContent`) e `calendar`.

**Duas armadilhas de versão resolvidas:**
- `react-day-picker "latest"` resolve hoje para a v10, que remove
  `getDefaultClassNames` e o tipo `DayButton` que o `calendar.tsx`
  do registry usa — fixado em `9.14.0`, a última v9, para bater com
  o código do componente.
- O `chart.tsx` atual do registry importa `TooltipValueType` de
  `recharts`, um tipo que só existe na major 3 — apesar de
  `registry.json` ainda listar `recharts@2.15.4` como dependência
  (desatualizado). Instalado `recharts@^3`, que declara suporte a
  React 19.

**O que foi feito:**
- `src/lib/mock-data/fluxo-caixa.ts`: série diária de entradas/saídas
  (01/jul a 31/ago de 2026) gerada deterministicamente.
- `src/components/dashboard/date-range-picker.tsx`: adaptação do
  `DatePickerWithRange` fornecido pelo usuário — o original usa
  `<PopoverTrigger render={...}>` (API do Base UI); o `Popover` deste
  projeto é Radix, então virou `<PopoverTrigger asChild>`, padrão já
  usado em todo o resto do app. Localizado para pt-BR.
- `src/components/dashboard/cash-flow-chart.tsx`: reescrito sobre o
  `ChartLineInteractive` fornecido. As séries "desktop/mobile" viraram
  "Entradas/Saídas"; os botões de alternância mostram o total de cada
  série no período filtrado, e o tooltip formata valores em R$
  (`formatMoney`). O componente passou a ser dono do estado de
  período — o KPI (saldo inicial, entradas, saídas, resultado) é
  recalculado a partir dos dados filtrados, e a badge fixa "Agosto de
  2026" do cabeçalho deu lugar ao date range picker.

**Validado com:** `next build`, `eslint .`, captura de tela via
Playwright — alternância entre as séries, abertura do calendário
(dois meses, em pt-BR) e seleção de um novo intervalo, confirmando
que o botão do período, os KPIs e o gráfico atualizam juntos.

**Ajuste seguinte, a pedido do usuário:** a fileira de KPIs estática
(Saldo inicial/Entradas no período/Saídas no período/Resultado) foi
removida — era redundante com os cards de série. Em seu lugar, um
terceiro card "Saldo" (entradas − saídas) entrou na fileira de séries
alternáveis, antes de Entradas e Saídas, e é a série selecionada por
padrão ao abrir o dashboard.

**Terceiro ajuste, a pedido do usuário:**
- "Saldo" passou de resultado líquido do período para **saldo
  acumulado de verdade** — soma entradas − saídas desde o início da
  série mockada (`fluxoCaixaAcumulado` em `cash-flow-chart.tsx`) e não
  reinicia ao trocar o filtro de período, então pode aparecer negativo
  se as saídas superarem as entradas acumuladas.
- Número do card "Saldo" mudou de azul para preto.
- Eixo Y adicionado ao gráfico, com a mesma formatação compacta
  ("R$ 70k") do gráfico de barras — `formatMoneyCompact` em
  `src/lib/format.ts`.
- A série ativa agora desenha sólido até `HOJE` (17/08/2026, a mesma
  data fictícia de "hoje" usada no resto do dashboard, definida em
  `fluxo-caixa.ts`) e pontilhado depois, para marcar visualmente que
  a parte futura é projeção — dois `<Line>` do recharts com dataKeys
  complementares (`valorReal`/`valorPrevisto`) que se tocam no dia de
  virada para não abrir espaço em branco entre os trechos.
- `isAnimationActive={false}` nas duas linhas: sem isso, o recharts
  anima o traço crescendo a cada troca de série/filtro, e uma captura
  de tela batida logo em seguida flagrava o gráfico "vazio" no meio
  da animação.

**Quarto ajuste, a pedido do usuário — escala do eixo Y:**
- O eixo Y do gráfico não começa mais sempre em zero: agora usa uma
  escala "nice numbers" (`niceTicks` em `cash-flow-chart.tsx`) que
  arredonda o mínimo/máximo do eixo para valores redondos próximos do
  mínimo/máximo real dos dados, evitando que a linha fique espremida
  no topo do gráfico. Quando o saldo do período é negativo, a escala
  se estende para baixo automaticamente (o algoritmo sempre inclui um
  tick em zero quando o intervalo cruza zero, já que o passo — 1, 2 ou
  5 × potência de 10 — é sempre um divisor exato de zero).
- Rótulos do eixo passaram do formato compacto ("R$ 70k") para valores
  por extenso ("R$ 70.000") — `formatMoneyAxis` substituiu
  `formatMoneyCompact` em `src/lib/format.ts`.
- Quando a série ativa é "Saldo" e o saldo do período é negativo, a
  linha do gráfico (sólida e pontilhada) muda de preto para vermelho
  (`#e5484d`, a mesma cor usada em "Saídas").
- **Bug encontrado e corrigido durante a validação:** passar apenas
  `domain={[min, max]}` para o `<YAxis>` do recharts não bastava — o
  gerador de ticks padrão dele (`getTickValuesFixedDomain`) sempre
  acrescenta o limite exato do domain como último tick, mesmo quando
  ele não é múltiplo do step calculado, e depois descarta ticks
  vizinhos que colidiriam visualmente. Resultado: espaçamento
  inconsistente entre os números do eixo (confirmado inspecionando o
  DOM renderizado — ex.: 150k → 190k → 230k → 300k, passos de
  40k/40k/70k). Corrigido calculando a lista de ticks manualmente e
  passando-a explicitamente via prop `ticks`, em vez de deixar o
  recharts recalcular a partir do domain.
- Validado com `next build`, `eslint .`, e inspeção do DOM renderizado
  via Playwright (texto dos ticks do eixo Y extraído diretamente dos
  elementos `<text>`, não só por captura de tela) — confirmando passo
  uniforme em um período positivo (150.000/200.000/250.000/300.000) e
  extensão correta abaixo de zero com um período de saldo negativo
  (selecionando 01/jul/2026, o único dia com saldo acumulado negativo
  nos dados mockados).
