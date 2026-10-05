-- Marcadores padrão (RN-36) para as organizações que já existiam. As novas
-- recebem os mesmos ao serem criadas — mantenha esta lista igual à de
-- src/modules/markers/defaults.ts.

INSERT INTO "markers" ("id", "organization_id", "type", "name", "color")
SELECT gen_random_uuid(), o."id", d."type"::"entry_type", d."name", d."color"
FROM "organizations" o
CROSS JOIN (VALUES
  ('RECEIVABLE', 'Cobrado, sem retorno', 'orange'),
  ('RECEIVABLE', 'Não atende / não responde', 'red'),
  ('RECEIVABLE', 'Pagamento combinado', 'blue'),
  ('RECEIVABLE', 'Em negociação', 'violet'),
  ('RECEIVABLE', 'Contestado', 'gray'),
  ('PAYABLE', 'Aguardando nota fiscal', 'amber'),
  ('PAYABLE', 'Agendado', 'blue'),
  ('PAYABLE', 'Em negociação', 'violet'),
  ('PAYABLE', 'Contestado', 'gray')
) AS d("type", "name", "color")
ON CONFLICT ("organization_id", "type", "name") DO NOTHING;
