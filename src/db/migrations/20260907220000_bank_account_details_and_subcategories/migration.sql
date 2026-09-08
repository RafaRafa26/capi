-- Bank accounts: kind (checking / savings pocket), holder type (PF/PJ) and
-- the control start date the opening balance is anchored to. Tables are
-- empty in every environment this has run in so far, so no backfill needed.

-- CreateEnum
CREATE TYPE "account_kind" AS ENUM ('CHECKING', 'SAVINGS_POCKET');

-- AlterTable
ALTER TABLE "bank_accounts"
  ADD COLUMN "kind" "account_kind" NOT NULL DEFAULT 'CHECKING',
  ADD COLUMN "holder_type" "person_type" NOT NULL,
  ADD COLUMN "control_start_date" DATE NOT NULL;

-- Categories: self-referential parent for subcategories. Uniqueness moves
-- from (organization, name) to (organization, parent, name) so the same
-- subcategory name can exist under different parent categories.

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "parent_id" UUID;

-- DropIndex
DROP INDEX "categories_organization_id_name_key";

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_organization_id_parent_id_name_key" ON "categories"("organization_id", "parent_id", "name");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
