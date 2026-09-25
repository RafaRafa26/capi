-- DropIndex
DROP INDEX "entries_organization_id_idx";

-- CreateIndex
CREATE INDEX "entries_organization_id_type_due_date_idx" ON "entries"("organization_id", "type", "due_date");
