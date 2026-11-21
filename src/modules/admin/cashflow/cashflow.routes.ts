import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreateCashflowEntry,
	handleDeleteCashflowEntry,
	handleGetCashflowEntries,
	handleGetCashflowStats,
	handleUpdateCashflowEntry,
} from "./cashflow.controller.js";
import {
	createCashflowSchema,
	getCashflowQuerySchema,
	getCashflowStatsQuerySchema,
	updateCashflowSchema,
} from "./cashflow.schema.js";

export const cashflowRouter: Router = Router();

cashflowRouter.get(
	"/api/v1/admin/cashflow/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getCashflowStatsQuerySchema),
	handleGetCashflowStats,
);

cashflowRouter.get(
	"/api/v1/admin/cashflow",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getCashflowQuerySchema),
	handleGetCashflowEntries,
);

cashflowRouter.post(
	"/api/v1/admin/cashflow",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", createCashflowSchema),
	handleCreateCashflowEntry,
);

cashflowRouter.patch(
	"/api/v1/admin/cashflow/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", updateCashflowSchema),
	handleUpdateCashflowEntry,
);

cashflowRouter.delete(
	"/api/v1/admin/cashflow/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleDeleteCashflowEntry,
);
