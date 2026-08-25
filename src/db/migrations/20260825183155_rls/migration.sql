-- Row Level Security (ARQUITETURA.md AD-02).
--
-- Modelo de acesso em dois papéis:
--
--   capi      (dono das tabelas) — usado APENAS por migrações, seed e pelas
--             consultas de autenticação, que por natureza precisam procurar
--             um usuário por e-mail antes de saber a que organização ele
--             pertence. Dono de tabela ignora RLS por padrão no Postgres.
--
--   capi_app  (aplicação) — usado por todo o resto. NÃO é dono e NÃO é
--             superusuário, então as políticas abaixo se aplicam de verdade.
--             Cada transação declara em que organização está operando via
--             `SET LOCAL app.organizacao_id`.
--
-- A aplicação continua filtrando por organizacao_id explicitamente; o RLS é
-- rede de proteção, não substituto do filtro (ARQUITETURA §8.3.3).

-- ------------------------------------------------------------------ papel

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'capi_app') THEN
    CREATE ROLE capi_app LOGIN PASSWORD 'capi_app_local';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO capi_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO capi_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO capi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO capi_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO capi_app;

-- A aplicação nunca deve escrever no histórico de migrações. Condicional
-- porque no shadow database essa tabela ainda não existe quando a migração
-- roda.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    REVOKE ALL ON TABLE "_prisma_migrations" FROM capi_app;
  END IF;
END
$$;

-- ------------------------------------------------- organização da transação

-- STABLE, não IMMUTABLE: o valor muda entre transações.
-- O segundo argumento `true` faz retornar NULL em vez de erro quando a
-- variável não foi definida — assim uma conexão que esqueceu de declarar a
-- organização enxerga zero linhas, em vez de estourar exceção.
CREATE OR REPLACE FUNCTION app_organizacao_atual() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organizacao_id', true), '')::uuid
$$;

-- ------------------------------------------------------------- políticas

-- Tabelas que carregam organizacao_id diretamente.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usuario', 'contato', 'conta_bancaria', 'categoria', 'centro_custo',
    'lancamento', 'importacao', 'transacao_bancaria', 'liquidacao',
    'movimento_custodia'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_isolamento', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (organizacao_id = app_organizacao_atual())
         WITH CHECK (organizacao_id = app_organizacao_atual())',
      t || '_isolamento', t
    );
  END LOOP;
END
$$;

-- A própria organização: isolada pelo id.
ALTER TABLE "organizacao" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizacao_isolamento ON "organizacao";
CREATE POLICY organizacao_isolamento ON "organizacao"
  USING (id = app_organizacao_atual())
  WITH CHECK (id = app_organizacao_atual());

-- Tabelas sem organizacao_id próprio: herdam o isolamento do pai.

ALTER TABLE "destinacao" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS destinacao_isolamento ON "destinacao";
CREATE POLICY destinacao_isolamento ON "destinacao"
  USING (EXISTS (
    SELECT 1 FROM "lancamento" l
    WHERE l.id = "destinacao".lancamento_id
      AND l.organizacao_id = app_organizacao_atual()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "lancamento" l
    WHERE l.id = "destinacao".lancamento_id
      AND l.organizacao_id = app_organizacao_atual()
  ));

ALTER TABLE "sessao" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessao_isolamento ON "sessao";
CREATE POLICY sessao_isolamento ON "sessao"
  USING (EXISTS (
    SELECT 1 FROM "usuario" u
    WHERE u.id = "sessao".usuario_id
      AND u.organizacao_id = app_organizacao_atual()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "usuario" u
    WHERE u.id = "sessao".usuario_id
      AND u.organizacao_id = app_organizacao_atual()
  ));
