import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import {
	handleGetBatchPayments,
	handleUploadPayment,
} from "./payments.controller.js";
import { uploadPaymentProof } from "./upload.middleware.js";

export const paymentsRouter = Router();

paymentsRouter.post(
	"/api/v1/buyer/invoices/:id/payments",
	requireAuth,
	requireBuyer,
	uploadPaymentProof,
	handleUploadPayment,
);

paymentsRouter.get(
	"/api/v1/buyer/invoices/:id/payments",
	requireAuth,
	requireBuyer,
	handleGetBatchPayments,
);
