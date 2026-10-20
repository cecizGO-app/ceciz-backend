import { Router } from "express";
import {
	getAllTracking,
	getTrackingByBatchId,
	updateTracking,
} from "../controllers/tracking.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";

export const router: Router = Router();

router.get(
	"/api/v1/admin/tracking",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getAllTracking,
);

router.get(
	"/api/v1/admin/tracking/:batchId",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getTrackingByBatchId,
);

router.patch(
	"/api/v1/admin/tracking/:batchId",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	updateTracking,
);

export default router;
