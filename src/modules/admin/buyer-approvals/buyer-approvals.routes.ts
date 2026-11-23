import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleBulkVerifyBuyerApprovals,
	handleGetBuyerApprovalStats,
	handleGetBuyerApprovals,
	handleVerifyBuyerApproval,
} from "./buyer-approvals.controller.js";
import {
	bulkVerifyBuyerApprovalsSchema,
	getBuyerApprovalsQuerySchema,
	verifyBuyerApprovalSchema,
} from "./buyer-approvals.schema.js";

export const buyerApprovalsRouter: Router = Router();

// Summary stats for the 4 top cards & tab counts
buyerApprovalsRouter.get(
	"/api/v1/admin/buyer-approvals/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetBuyerApprovalStats,
);

// Bulk approve / reject buyer accounts
buyerApprovalsRouter.post(
	"/api/v1/admin/buyer-approvals/bulk-verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", bulkVerifyBuyerApprovalsSchema),
	handleBulkVerifyBuyerApprovals,
);

// List buyer accounts with status tabs, lineGroup filter, search & pagination
buyerApprovalsRouter.get(
	"/api/v1/admin/buyer-approvals",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getBuyerApprovalsQuerySchema),
	handleGetBuyerApprovals,
);

// Approve or reject a single buyer account
buyerApprovalsRouter.patch(
	"/api/v1/admin/buyer-approvals/:id/verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", verifyBuyerApprovalSchema),
	handleVerifyBuyerApproval,
);
