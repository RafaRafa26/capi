-- A user stops belonging to exactly one organization: the link (and the
-- role, which is per organization) moves to `memberships`, so the same login
-- can work in several companies. Invitations are links the admin copies.

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'VIEWER';

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'OPERATOR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- Every existing user keeps access to their organization, with the same role.
INSERT INTO "memberships" ("id", "organization_id", "user_id", "role", "created_at")
SELECT gen_random_uuid(), "organization_id", "id", "role", "created_at" FROM "users";

-- These policies read users.organization_id, which is about to go away.
DROP POLICY IF EXISTS users_isolation ON "users";
DROP POLICY IF EXISTS sessions_isolation ON "sessions";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- DropIndex
DROP INDEX "users_organization_id_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "organization_id",
DROP COLUMN "role";

-- The document becomes the organization's identity across the system:
-- normalized to digits so "12.345.678/0001-90" and "12345678000190" collide.
UPDATE "organizations" SET "document" = regexp_replace("document", '\D', '', 'g');

-- CreateIndex
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_organization_id_idx" ON "invitations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_document_key" ON "organizations"("document");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ------------------------------------------------------------------ RLS
-- (ARQUITETURA.md AD-02; current_organization() is defined in *_rls.)

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['memberships', 'invitations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_isolation', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (organization_id = current_organization())
         WITH CHECK (organization_id = current_organization())',
      t || '_isolation', t
    );
  END LOOP;
END
$$;

-- Users are global now: the application role sees a user only while they
-- are a member of the organization the transaction declared. Creating users
-- (sign-up) happens under the owner role, like the login lookup.
CREATE POLICY users_isolation ON "users"
  USING (EXISTS (
    SELECT 1 FROM "memberships" m
    WHERE m.user_id = "users".id
      AND m.organization_id = current_organization()
  ));

-- Sessions belong to a person, not to an organization, and only the auth
-- code (owner role) touches them. RLS stays enabled with no policy, so the
-- application role can't read or write any session row.
