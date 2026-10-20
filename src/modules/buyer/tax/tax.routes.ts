import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { validate } from "../../../middleware/validate.js";
import { uploadPaymentProof } from "../payments/upload.middleware.js";
import {
	handleGetTaxInvoiceById,
	handleGetTaxInvoices,
	handleGetTaxPayments,
	handleUploadTaxPayment,
} from "./tax.controller.js";
import { getTaxInvoicesQuerySchema } from "./tax.schema.js";

export const taxRouter = Router();

taxRouter.get(
	"/api/v1/buyer/tax-invoices",
	requireAuth,
	requireBuyer,
	validate("query", getTaxInvoicesQuerySchema),
	handleGetTaxInvoices,
);

taxRouter.get(
	"/api/v1/buyer/tax-invoices/:id",
	requireAuth,
	requireBuyer,
	handleGetTaxInvoiceById,
);

taxRouter.post(
	"/api/v1/buyer/tax-invoices/:id/payments",
	requireAuth,
	requireBuyer,
	uploadPaymentProof,
	handleUploadTaxPayment,
);

taxRouter.get(
	"/api/v1/buyer/tax-invoices/:id/payments",
	requireAuth,
	requireBuyer,
	handleGetTaxPayments,
);
