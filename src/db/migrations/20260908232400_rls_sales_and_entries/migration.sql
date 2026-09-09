-- Row Level Security for the tables added in this migration set (ARQUITETURA.md AD-02).
-- Reuses current_organization(), defined in the initial RLS migration.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sales', 'entries', 'allocations']
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
