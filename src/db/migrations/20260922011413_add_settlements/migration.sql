-- CreateEnum
CREATE TYPE "settlement_origin" AS ENUM ('STATEMENT', 'MANUAL');

-- CreateTable
CREATE TABLE "settlements" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "bank_transaction_id" UUID,
    "origin" "settlement_origin" NOT NULL,
    "settled_amount" INTEGER NOT NULL,
    "interest" INTEGER NOT NULL DEFAULT 0,
    "fine" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "settled_at" DATE NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "settlements_organization_id_idx" ON "settlements"("organization_id");

-- CreateIndex
CREATE INDEX "settlements_entry_id_idx" ON "settlements"("entry_id");

-- CreateIndex
CREATE INDEX "settlements_bank_transaction_id_idx" ON "settlements"("bank_transaction_id");

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
