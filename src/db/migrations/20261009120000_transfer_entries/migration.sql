-- CreateEnum
CREATE TYPE "transfer_direction" AS ENUM ('OUT', 'IN');

-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "transfer_direction" "transfer_direction",
ADD COLUMN     "transfer_pair_id" UUID,
ALTER COLUMN "contact_id" DROP NOT NULL,
ALTER COLUMN "category_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "entries_transfer_pair_id_key" ON "entries"("transfer_pair_id");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_transfer_pair_id_fkey" FOREIGN KEY ("transfer_pair_id") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

