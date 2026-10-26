import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { uploadImage } from "@/middleware/upload";
import { validate } from "@/middleware/validate";
import {
	handleBulkVerifyPayments,
	handleCreatePayment,
	handleGetPaymentBatchOptions,
	handleGetPaymentById,
	handleGetPaymentStats,
	handleGetPayments,
	handleLookupInvoice,
	handleUploadPaymentProof,
	handleVerifyPayment,
} from "./payments.controller.js";
import {
	bulkVerifyPaymentSchema,
	createPaymentSchema,
	getPaymentQuerySchema,
	invoiceLookupQuerySchema,
	verifyPaymentSchema,
} from "./payments.schema.js";

export const paymentsRouter: Router = Router();

// Dropdown "Semua Batch" / pilihan batch di modal tambah pembayaran
paymentsRouter.get(
	"/api/v1/admin/payments/batch-options",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetPaymentBatchOptions,
);

// Cari invoice berdasarkan buyer + batch (modal tambah pembayaran manual)
paymentsRouter.get(
	"/api/v1/admin/payments/invoice-lookup",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", invoiceLookupQuerySchema),
	handleLookupInvoice,
);

// Upload file image to Cloudflare R2
paymentsRouter.post(
	"/api/v1/upload",
	requireAuth,
	uploadImage.single("file"),
	handleUploadPaymentProof,
);

// Summary stats for the 4 top cards
paymentsRouter.get(
	"/api/v1/admin/payments/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetPaymentStats,
);

// Bulk verify payments
paymentsRouter.post(
	"/api/v1/admin/payments/bulk-verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", bulkVerifyPaymentSchema),
	handleBulkVerifyPayments,
);

// Create manual payment (Button "+ Tambah Pembayaran")
paymentsRouter.post(
	"/api/v1/admin/payments",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", createPaymentSchema),
	handleCreatePayment,
);

// Get payments list with tabs, filters, search & pagination
paymentsRouter.get(
	"/api/v1/admin/payments",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getPaymentQuerySchema),
	handleGetPayments,
);

// Get payment detail by ID (Lihat Bukti)
paymentsRouter.get(
	"/api/v1/admin/payments/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetPaymentById,
);

// Verify single payment (Approve or Reject with reason)
paymentsRouter.patch(
	"/api/v1/admin/payments/:id/verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", verifyPaymentSchema),
	handleVerifyPayment,
);
