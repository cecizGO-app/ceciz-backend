import { Router } from "express";
import {
	createBatch,
	patchBatch,
	getBatch,
	getBatchId,
	deleteBatchId,
} from "@/controllers/batch.controller";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";

export const router: Router = Router();

router.post(
	"/api/v1/admin/batches",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	createBatch,
);

router.patch(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	patchBatch,
);

router.get(
	"/api/v1/admin/batches",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getBatch,
);

router.get(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getBatchId,
);

router.delete(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	deleteBatchId,
);

export default router;
