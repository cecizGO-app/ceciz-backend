import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetTrackingById,
	handleGetTrackings,
} from "./tracking.controller.js";
import { getTrackingQuerySchema } from "./tracking.schema.js";

export const trackingRouter: Router = Router();

trackingRouter.get(
	"/api/v1/buyer/tracking",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getTrackingQuerySchema),
	handleGetTrackings,
);

trackingRouter.get(
	"/api/v1/buyer/tracking/:id",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetTrackingById,
);
