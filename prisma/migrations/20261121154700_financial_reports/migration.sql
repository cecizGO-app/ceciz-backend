-- CreateTable
CREATE TABLE "profit_periods" (
    "id" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "batchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "batchCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "packingCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherCostNote" TEXT,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adminAPercent" INTEGER NOT NULL DEFAULT 80,
    "adminBPercent" INTEGER NOT NULL DEFAULT 20,
    "goSavingsPercent" INTEGER NOT NULL DEFAULT 0,
    "adminAAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adminBAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "goSavingsAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profit_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_fee_periods" (
    "id" TEXT NOT NULL,
    "periodName" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "batchCount" INTEGER NOT NULL DEFAULT 0,
    "batchIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feeNyelem" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "feeRekap" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_fee_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profit_periods_startDate_endDate_idx" ON "profit_periods"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "admin_fee_periods_periodName_idx" ON "admin_fee_periods"("periodName");
