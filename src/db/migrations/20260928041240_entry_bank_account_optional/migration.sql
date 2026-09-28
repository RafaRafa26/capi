-- DropForeignKey
ALTER TABLE "entries" DROP CONSTRAINT "entries_bank_account_id_fkey";

-- AlterTable
ALTER TABLE "entries" ALTER COLUMN "bank_account_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
