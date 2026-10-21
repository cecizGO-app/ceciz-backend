import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import { validate } from "../../../middleware/validate.js";
import {
	handleGetAllTracking,
	handleGetTrackingByBatchId,
	handleUpdateTracking,
} from "./tracking.controller.js";
import {
	getTrackingQuerySchema,
	updateTrackingSchema,
} from "./tracking.schema.js";

export const trackingRouter: Router = Router();

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
