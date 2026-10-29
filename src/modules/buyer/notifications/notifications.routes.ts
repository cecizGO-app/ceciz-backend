import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetNotifications,
	handleGetUnreadCount,
	handleMarkAllAsRead,
	handleMarkAsRead,
} from "./notifications.controller.js";
import { getNotificationsQuerySchema } from "./notifications.schema.js";

export const notificationsRouter: Router = Router();

notificationsRouter.get(
	"/api/v1/buyer/notifications",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getNotificationsQuerySchema),
	handleGetNotifications,
);

notificationsRouter.get(
	"/api/v1/buyer/notifications/unread-count",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetUnreadCount,
);

notificationsRouter.patch(
	"/api/v1/buyer/notifications/:id/read",
	requireAuth,
	requireRole(["BUYER"]),
	handleMarkAsRead,
);

notificationsRouter.patch(
	"/api/v1/buyer/notifications/read-all",
	requireAuth,
	requireRole(["BUYER"]),
	handleMarkAllAsRead,
);
