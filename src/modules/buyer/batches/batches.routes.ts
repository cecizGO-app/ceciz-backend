import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { validate } from "../../../middleware/validate.js";
import {
	handleGetBuyerBatchById,
	handleGetBuyerBatches,
} from "./batches.controller.js";
import { getBuyerBatchesQuerySchema } from "./batches.schema.js";

export const batchesRouter: Router = Router();

batchesRouter.get(
	"/api/v1/buyer/batches",
	requireAuth,
	requireBuyer,
	validate("query", getBuyerBatchesQuerySchema),
	handleGetBuyerBatches,
);

batchesRouter.get(
	"/api/v1/buyer/batches/:id",
	requireAuth,
	requireBuyer,
	handleGetBuyerBatchById,
);
