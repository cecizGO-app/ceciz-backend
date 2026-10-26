import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetAllTracking,
	handleGetTrackingByBatchId,
	handleGetTrackingStats,
	handleUpdateTracking,
} from "./tracking.controller.js";
import {
	getTrackingQuerySchema,
	updateTrackingSchema,
} from "./tracking.schema.js";

export const trackingRouter: Router = Router();

trackingRouter.get(
	"/api/v1/admin/tracking/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTrackingStats,
);

trackingRouter.get(
	"/api/v1/admin/tracking",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getTrackingQuerySchema),
	handleGetAllTracking,
);

trackingRouter.get(
	"/api/v1/admin/tracking/:batchId",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetTrackingByBatchId,
);

trackingRouter.patch(
	"/api/v1/admin/tracking/:batchId",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", updateTrackingSchema),
	handleUpdateTracking,
);
