-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "beneficiary_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payouts_entry_id_key" ON "payouts"("entry_id");

-- CreateIndex
CREATE INDEX "payouts_organization_id_idx" ON "payouts"("organization_id");

-- CreateIndex
CREATE INDEX "payouts_beneficiary_id_idx" ON "payouts"("beneficiary_id");

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "contacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
