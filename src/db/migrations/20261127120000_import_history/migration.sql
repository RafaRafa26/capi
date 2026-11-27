-- Import history: who uploaded each OFX and what the import saw. Nullable so
-- the rows that already exist stay valid — the history counts their linked
-- bank transactions instead. RLS on "imports" is unchanged: new columns are
-- covered by the existing imports_isolation policy.

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "duplicate_count" INTEGER,
ADD COLUMN     "imported_count" INTEGER,
ADD COLUMN     "total_count" INTEGER;

-- CreateIndex
CREATE INDEX "imports_bank_account_id_created_at_idx" ON "imports"("bank_account_id", "created_at");

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
