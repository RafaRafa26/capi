-- Payout entries were created as "Repasse — <favorecido>"; the UI now uses a
-- plain hyphen. Only touches entries that are payouts and still carry the
-- generated prefix, so a description edited by hand is left alone.
UPDATE "entries"
SET "description" = 'Repasse - ' || substr("description", length('Repasse — ') + 1)
WHERE "id" IN (SELECT "entry_id" FROM "payouts")
  AND "description" LIKE 'Repasse — %';
