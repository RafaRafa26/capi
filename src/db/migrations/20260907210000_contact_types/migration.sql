-- Replaces the multi-valued `roles[]` (payer/beneficiary/supplier) with a
-- single required `contact_type`, and adds `legal_name` ("razão social") for
-- companies. Existing rows (dev seed data) are backfilled to CLIENT before
-- the column is made required.

-- CreateEnum
CREATE TYPE "contact_type" AS ENUM ('CLIENT', 'SUPPLIER', 'BENEFICIARY', 'EMPLOYEE', 'PARTNER');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN "legal_name" TEXT;
ALTER TABLE "contacts" ADD COLUMN "contact_type" "contact_type";

UPDATE "contacts" SET "contact_type" = 'CLIENT' WHERE "contact_type" IS NULL;

ALTER TABLE "contacts" ALTER COLUMN "contact_type" SET NOT NULL;
ALTER TABLE "contacts" DROP COLUMN "roles";

-- DropEnum
DROP TYPE "contact_role";
