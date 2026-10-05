-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "marker_id" UUID,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "notes_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "markers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "entry_type" NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "markers_organization_id_type_name_key" ON "markers"("organization_id", "type", "name");

-- CreateIndex
CREATE INDEX "entries_marker_id_idx" ON "entries"("marker_id");

-- AddForeignKey
ALTER TABLE "entries" ADD CONSTRAINT "entries_marker_id_fkey" FOREIGN KEY ("marker_id") REFERENCES "markers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "markers" ADD CONSTRAINT "markers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
