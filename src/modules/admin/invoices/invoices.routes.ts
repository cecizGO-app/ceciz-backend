import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGenerateInvoices,
	handleGetInvoiceById,
	handleGetInvoicePreview,
	handleGetInvoiceStats,
	handleGetInvoices,
	handleWaivePenalty,
} from "./invoices.controller.js";
import {
	generateInvoicesSchema,
	getInvoicesAdminQuerySchema,
	waivePenaltySchema,
} from "./invoices.schema.js";

export const invoicesRouter: Router = Router();

// 1. Stats untuk 4 kartu dashboard invoice
invoicesRouter.get(
	"/api/v1/admin/invoices/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetInvoiceStats,
);

// 2. Preview tagihan per buyer sebelum generate
invoicesRouter.get(
	"/api/v1/admin/invoices/preview/:batchId",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetInvoicePreview,
);

// 3. Generate / rilis invoice untuk semua buyer dalam batch
invoicesRouter.post(
	"/api/v1/admin/invoices/generate",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", generateInvoicesSchema),
	handleGenerateInvoices,
);

// 4. List invoice (tabel utama)
invoicesRouter.get(
	"/api/v1/admin/invoices",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getInvoicesAdminQuerySchema),
	handleGetInvoices,
);

// 5. Detail invoice
invoicesRouter.get(
	"/api/v1/admin/invoices/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetInvoiceById,
);

// 6. Waive penalty (bebaskan denda) - khusus OWNER
invoicesRouter.patch(
	"/api/v1/admin/invoices/:id/waive-penalty",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", waivePenaltySchema),
	handleWaivePenalty,
);
