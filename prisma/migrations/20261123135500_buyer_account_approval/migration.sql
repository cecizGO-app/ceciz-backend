-- CreateEnum
CREATE TYPE "LineGroup" AS ENUM ('GO_1', 'GO_2');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "approvalRejectReason" TEXT,
ADD COLUMN     "approvalStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvalSubmittedAt" TIMESTAMP(3),
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "lineGroup" "LineGroup";
