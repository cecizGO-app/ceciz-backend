-- CreateEnum
CREATE TYPE "PoOrderType" AS ENUM ('PO_ALBUM', 'CO_WEB');

-- CreateEnum
CREATE TYPE "PoCoStatus" AS ENUM ('NOT_STARTED', 'CO_OPEN', 'ORDER_SUBMITTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "po_album" ADD COLUMN     "coStatus" "PoCoStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "dpPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fpPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "memberName" TEXT,
ADD COLUMN     "orderType" "PoOrderType" NOT NULL DEFAULT 'PO_ALBUM',
ALTER COLUMN "dpMethod" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "po_album_batchNumber_idx" ON "po_album"("batchNumber");
