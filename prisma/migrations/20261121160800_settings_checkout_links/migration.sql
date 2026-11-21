-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "checkoutEndDate" TIMESTAMP(3),
ADD COLUMN     "checkoutStartDate" TIMESTAMP(3),
ADD COLUMN     "googleFormOpen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleFormUrl" TEXT,
ADD COLUMN     "shopeeCheckoutUrl" TEXT,
ADD COLUMN     "shopeeOpen" BOOLEAN NOT NULL DEFAULT false;
