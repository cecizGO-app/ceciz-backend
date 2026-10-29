import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetVapidPublicKey,
	handleSubscribePush,
	handleUnsubscribePush,
} from "./push.controller.js";
import { subscribePushSchema, unsubscribePushSchema } from "./push.schema.js";

export const pushRouter: Router = Router();

// Public - no auth required
pushRouter.get("/api/v1/buyer/push/vapid-public-key", handleGetVapidPublicKey);

pushRouter.post(
	"/api/v1/buyer/push/subscribe",
	requireAuth,
	requireRole(["BUYER"]),
	validate("body", subscribePushSchema),
	handleSubscribePush,
);

pushRouter.delete(
	"/api/v1/buyer/push/subscribe",
	requireAuth,
	requireRole(["BUYER"]),
	validate("body", unsubscribePushSchema),
	handleUnsubscribePush,
);
