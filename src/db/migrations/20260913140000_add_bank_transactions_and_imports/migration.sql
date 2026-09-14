-- CreateEnum
CREATE TYPE "bank_transaction_status" AS ENUM ('PENDING', 'RECONCILED', 'IGNORED');

-- CreateTable
CREATE TABLE "imports" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "period_start" DATE,
    "period_end" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "import_id" UUID NOT NULL,
    "bank_reference" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" "bank_transaction_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imports_organization_id_idx" ON "imports"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_bank_account_id_bank_reference_key" ON "bank_transactions"("bank_account_id", "bank_reference");

-- CreateIndex
CREATE INDEX "bank_transactions_organization_id_idx" ON "bank_transactions"("organization_id");

-- CreateIndex
CREATE INDEX "bank_transactions_import_id_idx" ON "bank_transactions"("import_id");

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
