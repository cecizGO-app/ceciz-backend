import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { uploadPaymentProof } from "@/modules/buyer/payments/upload.middleware";
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
	requireRole(["BUYER"]),
	handleGetTaxInvoices,
);

taxRouter.get(
	"/api/v1/buyer/taxes/:id",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetTaxInvoiceById,
);

taxRouter.post(
	"/api/v1/buyer/taxes/:id/payments",
	requireAuth,
	requireRole(["BUYER"]),
	uploadPaymentProof,
	handleUploadTaxPayment,
);

taxRouter.get(
	"/api/v1/buyer/taxes/:id/payments",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetTaxPayments,
);
