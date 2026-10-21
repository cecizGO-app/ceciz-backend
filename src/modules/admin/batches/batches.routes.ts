import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireRole } from "../../../middleware/requireRole.js";
import { validate } from "../../../middleware/validate.js";
import {
	handleCreateBatch,
	handleDeleteBatch,
	handleGetBatchById,
	handleGetBatches,
	handleGetBatchStats,
	handleUpdateBatch,
} from "./batches.controller.js";
import {
	createBatchSchema,
	getBatchQuerySchema,
	updateBatchSchema,
} from "./batches.schema.js";

export const batchesRouter: Router = Router();

batchesRouter.post(
	"/api/v1/admin/batches",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", createBatchSchema),
	handleCreateBatch,
);

batchesRouter.get(
	"/api/v1/admin/batches/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetBatchStats,
);

batchesRouter.patch(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", updateBatchSchema),
	handleUpdateBatch,
);

batchesRouter.get(
	"/api/v1/admin/batches",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getBatchQuerySchema),
	handleGetBatches,
);

batchesRouter.get(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetBatchById,
);

batchesRouter.delete(
	"/api/v1/admin/batches/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleDeleteBatch,
);
