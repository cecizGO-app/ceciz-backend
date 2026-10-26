import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreateBatch,
	handleDeleteBatch,
	handleGetAdminUsers,
	handleGetBatchById,
	handleGetBatches,
	handleGetBatchFormOptions,
	handleGetBatchStats,
	handleGetNextBatchNumber,
	handleUpdateBatch,
} from "./batches.controller.js";
import {
	createBatchSchema,
	getAdminUsersQuerySchema,
	getBatchQuerySchema,
	getNextBatchNumberQuerySchema,
	updateBatchSchema,
} from "./batches.schema.js";

export const batchesRouter: Router = Router();

batchesRouter.get(
	"/api/v1/admin/users",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getAdminUsersQuerySchema),
	handleGetAdminUsers,
);

batchesRouter.get(
	"/api/v1/admin/batches/form-options",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetBatchFormOptions,
);

batchesRouter.get(
	"/api/v1/admin/batches/next-number",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getNextBatchNumberQuerySchema),
	handleGetNextBatchNumber,
);

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
