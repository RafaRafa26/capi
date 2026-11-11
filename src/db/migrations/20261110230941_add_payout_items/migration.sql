-- CreateTable
CREATE TABLE "payout_items" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "payout_id" UUID NOT NULL,
    "settlement_id" UUID NOT NULL,
    "allocation_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_items_organization_id_idx" ON "payout_items"("organization_id");

-- CreateIndex
CREATE INDEX "payout_items_payout_id_idx" ON "payout_items"("payout_id");

-- CreateIndex
CREATE INDEX "payout_items_settlement_id_idx" ON "payout_items"("settlement_id");

-- CreateIndex
CREATE INDEX "payout_items_allocation_id_idx" ON "payout_items"("allocation_id");

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_items" ADD CONSTRAINT "payout_items_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "allocations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
