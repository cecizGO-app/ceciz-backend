import { Router } from "express";
import {
	getAllTracking,
	getTrackingByBatchId,
	updateTracking,
} from "@/controllers/tracking.controller";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";

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
