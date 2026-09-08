-- Removes the OWN/THIRD_PARTY distinction from bank accounts. Every account
-- registered here now belongs to the organization by definition — see the
-- comment on the BankAccount model. Documenting where a manual write-off
-- landed (RN-20) is deferred to Fase 6 (Liquidacao), not modeled here.

ALTER TABLE "bank_accounts" DROP COLUMN "nature";

DROP TYPE "account_nature";
