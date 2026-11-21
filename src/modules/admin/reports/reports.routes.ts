import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreateAdminFeePeriod,
	handleCreateProfitPeriod,
	handleDeleteAdminFeePeriod,
	handleDeleteProfitPeriod,
	handleGetAdminFeeReport,
	handleGetPaymentSummaryReport,
	handleGetProfitReport,
	handleUpdateAdminFeePeriod,
} from "./reports.controller.js";
import {
	createAdminFeePeriodSchema,
	createProfitPeriodSchema,
	getAdminFeesQuerySchema,
	getPaymentSummaryQuerySchema,
	getProfitReportQuerySchema,
	updateAdminFeePeriodSchema,
} from "./reports.schema.js";

export const reportsRouter: Router = Router();

// Seluruh endpoint Financial Reports KHUSUS OWNER

// Tab 1: Laba GO
reportsRouter.get(
	"/api/v1/admin/reports/profit",
	requireAuth,
	requireRole(["OWNER"]),
	validate("query", getProfitReportQuerySchema),
	handleGetProfitReport,
);

reportsRouter.post(
	"/api/v1/admin/reports/profit/periods",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", createProfitPeriodSchema),
	handleCreateProfitPeriod,
);

reportsRouter.delete(
	"/api/v1/admin/reports/profit/periods/:id",
	requireAuth,
	requireRole(["OWNER"]),
	handleDeleteProfitPeriod,
);

// Tab 2: Gaji Admin (Fee Admin per Periode)
reportsRouter.get(
	"/api/v1/admin/reports/admin-fees",
	requireAuth,
	requireRole(["OWNER"]),
	validate("query", getAdminFeesQuerySchema),
	handleGetAdminFeeReport,
);

reportsRouter.post(
	"/api/v1/admin/reports/admin-fees",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", createAdminFeePeriodSchema),
	handleCreateAdminFeePeriod,
);

reportsRouter.patch(
	"/api/v1/admin/reports/admin-fees/:id",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", updateAdminFeePeriodSchema),
	handleUpdateAdminFeePeriod,
);

reportsRouter.delete(
	"/api/v1/admin/reports/admin-fees/:id",
	requireAuth,
	requireRole(["OWNER"]),
	handleDeleteAdminFeePeriod,
);

// Tab 3: Rekap Pembayaran
reportsRouter.get(
	"/api/v1/admin/reports/payment-summary",
	requireAuth,
	requireRole(["OWNER"]),
	validate("query", getPaymentSummaryQuerySchema),
	handleGetPaymentSummaryReport,
);
