import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { uploadPaymentProof } from "../payments/upload.middleware.js";
import {
	handleGetTaxInvoiceById,
	handleGetTaxInvoices,
	handleGetTaxPayments,
	handleUploadTaxPayment,
} from "./tax.controller.js";

export const taxRouter: Router = Router();

taxRouter.get(
	"/api/v1/buyer/taxes",
	requireAuth,
	requireBuyer,
	handleGetTaxInvoices,
);

taxRouter.get(
	"/api/v1/buyer/taxes/:id",
	requireAuth,
	requireBuyer,
	handleGetTaxInvoiceById,
);

taxRouter.post(
	"/api/v1/buyer/taxes/:id/payments",
	requireAuth,
	requireBuyer,
	uploadPaymentProof,
	handleUploadTaxPayment,
);

taxRouter.get(
	"/api/v1/buyer/taxes/:id/payments",
	requireAuth,
	requireBuyer,
	handleGetTaxPayments,
);
