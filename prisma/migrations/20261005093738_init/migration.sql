-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF', 'BUYER');

-- CreateEnum
CREATE TYPE "CountryCode" AS ENUM ('CH', 'KR', 'TH', 'JP', 'INA');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'AWAITING_VERIFICATION', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BCA', 'QRIS', 'SEABANK', 'SPAY', 'CASH');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('PO', 'ON_SELLER_HAND', 'ARRIVED_WH_LUAR', 'OTW_INA', 'ARRIVED_WH_INA', 'BISA_DI_CO', 'DONE');

-- CreateEnum
CREATE TYPE "TaxInvoiceStatus" AS ENUM ('DRAFT', 'RELEASED', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WEB_PUSH', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INVOICE_NEW', 'PAYMENT_REMINDER', 'PAYMENT_APPROVED', 'PAYMENT_REJECTED', 'TRACKING_UPDATE', 'TAX_INVOICE_NEW', 'TAX_REMINDER', 'CHECKOUT_REMINDER');

-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'BUYER',
    "contact" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "countryCode" "CountryCode" NOT NULL,
    "batchNumber" INTEGER NOT NULL,
    "batchDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "shippingFee" DECIMAL(14,2),
    "feeGo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "feeRekap" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "feeNyelem" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "rateHarian" DECIMAL(14,4),
    "feeWh" DECIMAL(14,2),
    "feeProxy" DECIMAL(14,2),
    "adminNyelemId" TEXT,
    "proxyCoName" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'OPEN',
    "hargaTotal" DECIMAL(14,2),
    "hargaTfSeller" DECIMAL(14,2),
    "selisihHarga" DECIMAL(14,2),
    "labaBersih" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerName" TEXT,
    "description" TEXT NOT NULL,
    "hargaAsli" DECIMAL(14,2) NOT NULL,
    "feeNyelem" DECIMAL(14,2),
    "hargaPerBuyer" DECIMAL(14,2),
    "hargaJualPerBuyer" DECIMAL(14,2),
    "pcs" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "itemQty" INTEGER NOT NULL DEFAULT 1,
    "orderStatus" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "itemDetail" JSONB NOT NULL,
    "jpHargaJual" DECIMAL(14,2),
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "deadlinePayment" TIMESTAMP(3) NOT NULL,
    "penaltyAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "paymentProofUrl" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "countryCode" "CountryCode" NOT NULL,
    "trackingStatus" "TrackingStatus" NOT NULL DEFAULT 'PO',
    "resiNumber" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whName" TEXT,
    "boxNo" TEXT,
    "description" TEXT,
    "checkedOut" BOOLEAN NOT NULL DEFAULT false,
    "uploadedToAlbum" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_invoices" (
    "id" TEXT NOT NULL,
    "releaseName" TEXT NOT NULL,
    "releasePeriod" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "coveredBatchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakdownDetail" JSONB NOT NULL,
    "taxInvoiceTotal" DECIMAL(14,2) NOT NULL,
    "deadlinePayment" TIMESTAMP(3) NOT NULL,
    "maxCheckoutDate" TIMESTAMP(3) NOT NULL,
    "status" "TaxInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "penaltyAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payments" (
    "id" TEXT NOT NULL,
    "taxInvoiceId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "taxPaymentProofUrl" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "taxVerificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wh_invoices" (
    "id" TEXT NOT NULL,
    "whInvoiceTotal" DECIMAL(14,2) NOT NULL,
    "coveredBatchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allocationRatio" JSONB,
    "allocatedAmount" JSONB,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wh_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "triggeredByEvent" TEXT NOT NULL,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cashflow_entries" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "type" "CashflowType" NOT NULL,
    "category" TEXT,
    "paymentMethod" "PaymentMethod",
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cashflow_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_album" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "totalQty" INTEGER,
    "harga" DECIMAL(14,2) NOT NULL,
    "totalHarga" DECIMAL(14,2) NOT NULL,
    "dpAmount" DECIMAL(14,2) NOT NULL,
    "dpMethod" "PaymentMethod" NOT NULL,
    "fpAmount" DECIMAL(14,2),
    "fpMethod" "PaymentMethod",
    "trackingStatus" "TrackingStatus" NOT NULL DEFAULT 'PO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "defaultFeeNyelem" DECIMAL(12,2) NOT NULL DEFAULT 2000,
    "dailyRate" JSONB NOT NULL,
    "penaltyPerDay" DECIMAL(12,2) NOT NULL DEFAULT 2000,
    "deadlineBatchHours" INTEGER NOT NULL DEFAULT 24,
    "deadlineTaxHours" INTEGER NOT NULL DEFAULT 72,
    "taxRatePcChThJp" DECIMAL(12,2) NOT NULL DEFAULT 7000,
    "taxRatePcKr" DECIMAL(12,2) NOT NULL DEFAULT 6000,
    "taxRateNonPcPerGram" DECIMAL(12,2),
    "feeRekapTiers" JSONB NOT NULL,
    "maxStorageDays" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "batches_countryCode_batchNumber_key" ON "batches"("countryCode", "batchNumber");

-- CreateIndex
CREATE INDEX "batch_items_batchId_idx" ON "batch_items"("batchId");

-- CreateIndex
CREATE INDEX "batch_items_buyerId_idx" ON "batch_items"("buyerId");

-- CreateIndex
CREATE INDEX "orders_batchId_idx" ON "orders"("batchId");

-- CreateIndex
CREATE INDEX "orders_buyerId_idx" ON "orders"("buyerId");

-- CreateIndex
CREATE INDEX "invoices_buyerId_idx" ON "invoices"("buyerId");

-- CreateIndex
CREATE INDEX "invoices_batchId_idx" ON "invoices"("batchId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_buyerId_idx" ON "payments"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_batchId_key" ON "tracking"("batchId");

-- CreateIndex
CREATE INDEX "tax_invoices_buyerId_idx" ON "tax_invoices"("buyerId");

-- CreateIndex
CREATE INDEX "tax_payments_taxInvoiceId_idx" ON "tax_payments"("taxInvoiceId");

-- CreateIndex
CREATE INDEX "tax_payments_buyerId_idx" ON "tax_payments"("buyerId");

-- CreateIndex
CREATE INDEX "notifications_buyerId_idx" ON "notifications"("buyerId");

-- CreateIndex
CREATE INDEX "po_album_buyerId_idx" ON "po_album"("buyerId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_adminNyelemId_fkey" FOREIGN KEY ("adminNyelemId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking" ADD CONSTRAINT "tracking_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_taxInvoiceId_fkey" FOREIGN KEY ("taxInvoiceId") REFERENCES "tax_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflow_entries" ADD CONSTRAINT "cashflow_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_album" ADD CONSTRAINT "po_album_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
