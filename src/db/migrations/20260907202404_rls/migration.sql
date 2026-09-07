-- Row Level Security (ARQUITETURA.md AD-02).
--
-- Two-role access model:
--
--   capi      (table owner) — used ONLY by migrations, seed, and the
--             authentication lookup, which by nature has to search a user by
--             e-mail before knowing which organization they belong to. A
--             table owner bypasses RLS by default in Postgres.
--
--   capi_app  (application) — used by everything else. NOT an owner and NOT
--             a superuser, so the policies below actually apply. Each
--             transaction declares which organization it's operating in via
--             `SET LOCAL app.organization_id`.
--
-- The application still filters by organization_id explicitly; RLS is a
-- safety net, not a substitute for the filter (ARQUITETURA §8.3.3).

-- ------------------------------------------------------------------- role

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

-- The application must never write to the migration history. Conditional
-- because in the shadow database this table doesn't exist yet when the
-- migration runs.
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

-- --------------------------------------------------- current organization

-- STABLE, not IMMUTABLE: the value changes between transactions.
-- The second argument `true` makes it return NULL instead of erroring when
-- the setting hasn't been defined — so a connection that forgot to declare
-- an organization sees zero rows instead of raising an exception.
CREATE OR REPLACE FUNCTION current_organization() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;

-- ------------------------------------------------------------- policies

-- Tables that carry organization_id directly.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'contacts']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (organization_id = current_organization())
         WITH CHECK (organization_id = current_organization())',
      t || '_isolation', t
    );
  END LOOP;
END
$$;

-- The organization itself: isolated by id.
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS organizations_isolation ON "organizations";
CREATE POLICY organizations_isolation ON "organizations"
  USING (id = current_organization())
  WITH CHECK (id = current_organization());

-- Tables without their own organization_id: inherit isolation from the parent.

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sessions_isolation ON "sessions";
CREATE POLICY sessions_isolation ON "sessions"
  USING (EXISTS (
    SELECT 1 FROM "users" u
    WHERE u.id = "sessions".user_id
      AND u.organization_id = current_organization()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "users" u
    WHERE u.id = "sessions".user_id
      AND u.organization_id = current_organization()
  ));
