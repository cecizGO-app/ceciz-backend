import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetBuyerBatchById,
	handleGetBuyerBatches,
} from "./batches.controller.js";
import { getBuyerBatchesQuerySchema } from "./batches.schema.js";

export const batchesRouter: Router = Router();

batchesRouter.get(
	"/api/v1/buyer/batches",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getBuyerBatchesQuerySchema),
	handleGetBuyerBatches,
);

batchesRouter.get(
	"/api/v1/buyer/batches/:id",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetBuyerBatchById,
);
