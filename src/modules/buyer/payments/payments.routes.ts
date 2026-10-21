import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import {
	handleGetBatchPayments,
	handleUploadPayment,
} from "./payments.controller.js";
import { uploadPaymentProof } from "./upload.middleware.js";

export const paymentsRouter: Router = Router();

paymentsRouter.post(
	"/api/v1/buyer/invoices/:id/payments",
	requireAuth,
	requireRole(["BUYER"]),
	uploadPaymentProof,
	handleUploadPayment,
);

paymentsRouter.get(
	"/api/v1/buyer/invoices/:id/payments",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetBatchPayments,
);
