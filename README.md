# Capi

Sistema de gestão de recebimentos e repasses de terceiros. Mantém uma conta
corrente por favorecido cujo saldo é consequência da conciliação bancária, em
vez de uma planilha por cliente.

Leia `ARQUITETURA.md` antes de mexer no código — ele define o modelo de
domínio, as regras de negócio numeradas (RN-01 a RN-22) e as decisões de
arquitetura. `PROGRESS.md` registra o que já foi construído.

## Como rodar localmente

Requisitos: Node 20+ e Docker (ou um Postgres 16+ acessível).

```bash
# 1. dependências
npm install

# 2. banco local
docker compose up -d

# 3. variáveis de ambiente
cp .env.example .env
#    e preencha as senhas — DATABASE_URL_APP usa o papel capi_app,
#    criado pela migração de RLS

# 4. schema + papel da aplicação + dados de demonstração
npm run db:migrate
npm run db:seed

# 5. subir
npm run dev
```

Abra http://localhost:3000 e entre com **rafael@email.com** / **capi1234**
(usuário criado pelo seed).

### Dois papéis de banco, de propósito

| Papel | Quem usa | RLS |
|---|---|---|
| `capi` (`DATABASE_URL`) | migrações, seed e as consultas de login | ignora — é dono das tabelas |
| `capi_app` (`DATABASE_URL_APP`) | todo o resto da aplicação | **sujeito às políticas** |

Cada transação da aplicação declara sua organização com
`SET LOCAL app.organizacao_id`, e o banco recusa qualquer linha de outra
organização — inclusive numa escrita. Ver `src/db/migrations/*_rls/`.

O login precisa procurar um usuário por e-mail antes de saber a que
organização ele pertence, por isso é o único ponto que roda no papel dono.

## Deploy

O `prisma generate` roda sozinho no `postinstall` e no início do `build` — o
Prisma Client é artefato e não vai versionado, então a plataforma o recria.

As URLs do banco são lidas **em tempo de requisição**, não no build: o
`next build` passa sem `DATABASE_URL`, e a falta dela só aparece quando uma
página tenta consultar. Isso é proposital, para o build não depender de ter
banco acessível. Na plataforma, configure antes do primeiro acesso:

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | papel dono — migrações e login |
| `DATABASE_URL_APP` | papel da aplicação, restrito por RLS |

Depois de provisionar o banco, rode `npx prisma migrate deploy` e **troque a
senha do papel `capi_app`** — a migração o cria com uma senha de
desenvolvimento:

```sql
ALTER ROLE capi_app PASSWORD 'senha-forte-de-producao';
```

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run lint         # eslint
npm test             # vitest (inclui testes contra o Postgres local)

npm run db:migrate   # aplica migrações pendentes
npm run db:seed      # recria a organização de demonstração
npm run db:reset     # apaga e recria o banco do zero
npm run db:studio    # inspeção visual das tabelas
```

Os testes de banco criam e destroem organizações próprias, então rodam contra
o mesmo Postgres de desenvolvimento sem sujá-lo.

## Organização do código

```
src/
  app/                  ← rotas, telas e server actions (BORDA)
  modules/              ← um diretório por área do domínio
    auth/               ← sessão e senha
    contatos/ categorias/ centros-de-custo/ contas-bancarias/
    lancamentos/        ← recebimentos, pagamentos, parcelamento
    extrato/            ← leitura de OFX e transações bancárias
    liquidacao/         ← conciliação e baixa manual (porta única da custódia)
    custodia/           ← o razão por favorecido, sempre derivado
    dashboard/
  shared/               ← dinheiro em centavos, erros
  db/                   ← schema Prisma, migrações, seed
```

Dentro de cada módulo: `esquema.ts` valida a entrada (Zod), `servico.ts`
orquestra e é o único que escreve no banco, `dominio.ts` guarda as regras
puras, `tipos.ts` carrega o que servidor e cliente compartilham.

`servico.ts` importa o driver do Postgres — um componente de cliente que
importar **valor** de lá arrasta o driver para o bundle do navegador. Por isso
tipos e constantes compartilhados moram em `tipos.ts`.
