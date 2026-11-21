-- AlterTable
ALTER TABLE "cashflow_entries" ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "cashflow_entries_entryDate_idx" ON "cashflow_entries"("entryDate");

-- CreateIndex
CREATE INDEX "cashflow_entries_type_idx" ON "cashflow_entries"("type");
