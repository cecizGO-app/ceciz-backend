-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "penaltyWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "penaltyWaivedAt" TIMESTAMP(3),
ADD COLUMN     "penaltyWaivedById" TEXT,
ADD COLUMN     "penaltyWaivedReason" TEXT;
