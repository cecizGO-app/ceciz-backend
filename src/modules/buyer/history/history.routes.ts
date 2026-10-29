import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetBatchHistory,
	handleGetPaymentHistory,
} from "./history.controller.js";
import { getHistoryQuerySchema } from "./history.schema.js";

export const historyRouter: Router = Router();

historyRouter.get(
	"/api/v1/buyer/history/batches",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getHistoryQuerySchema),
	handleGetBatchHistory,
);

historyRouter.get(
	"/api/v1/buyer/history/payments",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getHistoryQuerySchema),
	handleGetPaymentHistory,
);
