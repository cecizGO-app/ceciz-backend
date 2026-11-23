import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import { handleGetRecentActivities } from "./dashboard.controller.js";
import { getActivityLogsQuerySchema } from "./dashboard.schema.js";

export const dashboardRouter: Router = Router();

dashboardRouter.get(
	"/api/v1/admin/dashboard/activities",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getActivityLogsQuerySchema),
	handleGetRecentActivities,
);
