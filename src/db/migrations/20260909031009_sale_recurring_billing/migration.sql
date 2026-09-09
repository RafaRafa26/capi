-- CreateEnum
CREATE TYPE "billing_type" AS ENUM ('INSTALLMENTS', 'RECURRING');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "billing_type" "billing_type" NOT NULL DEFAULT 'INSTALLMENTS',
ADD COLUMN     "recurrence_end_date" DATE;
