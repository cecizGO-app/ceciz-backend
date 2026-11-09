import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleBulkVerifyTaxPayments,
	handleGetTaxInvoiceById,
	handleGetTaxInvoices,
	handleGetTaxPaymentById,
	handleGetTaxPayments,
	handleGetTaxPreview,
	handleGetTaxStats,
	handleReleaseTaxInvoices,
	handleVerifyTaxPayment,
} from "./tax.controller.js";
import {
	bulkVerifyTaxPaymentSchema,
	getTaxInvoicesAdminQuerySchema,
	getTaxPaymentsAdminQuerySchema,
	releaseTaxSchema,
	verifyTaxPaymentSchema,
} from "./tax.schema.js";

export const taxRouter: Router = Router();

// 1. Stats for the 4 top cards on Tax Dashboard
taxRouter.get(
	"/api/v1/admin/taxes/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTaxStats,
);

// 2. Step 1 Modal: Preview Arrived WH INA items ready for tax release
taxRouter.get(
	"/api/v1/admin/taxes/preview",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTaxPreview,
);

// 3. Step 2 & 3 Modal: Release periodic multi-batch tax invoices
taxRouter.post(
	"/api/v1/admin/taxes/releases",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", releaseTaxSchema),
	handleReleaseTaxInvoices,
);

// 4. Tax verification queue & payments
taxRouter.get(
	"/api/v1/admin/taxes/payments",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getTaxPaymentsAdminQuerySchema),
	handleGetTaxPayments,
);

taxRouter.post(
	"/api/v1/admin/taxes/payments/bulk-verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", bulkVerifyTaxPaymentSchema),
	handleBulkVerifyTaxPayments,
);

taxRouter.get(
	"/api/v1/admin/taxes/payments/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTaxPaymentById,
);

taxRouter.patch(
	"/api/v1/admin/taxes/payments/:id/verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", verifyTaxPaymentSchema),
	handleVerifyTaxPayment,
);

// 5. Invoices list (Table on Dashboard) & Detail
taxRouter.get(
	"/api/v1/admin/taxes/invoices",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getTaxInvoicesAdminQuerySchema),
	handleGetTaxInvoices,
);

taxRouter.get(
	"/api/v1/admin/taxes",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getTaxInvoicesAdminQuerySchema),
	handleGetTaxInvoices,
);

taxRouter.get(
	"/api/v1/admin/taxes/invoices/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTaxInvoiceById,
);
