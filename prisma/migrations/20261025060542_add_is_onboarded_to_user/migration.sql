-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "csContact" TEXT;

-- AlterTable
ALTER TABLE "tax_payments" ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "rejectReason" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_buyerId_idx" ON "push_subscriptions"("buyerId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
