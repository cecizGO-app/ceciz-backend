import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetSettings,
	handleResetSettings,
	handleUpdateSettings,
} from "./settings.controller.js";
import { updateSettingsSchema } from "./settings.schema.js";

export const settingsRouter: Router = Router();

// Seluruh endpoint Settings KHUSUS OWNER
settingsRouter.get(
	"/api/v1/admin/settings",
	requireAuth,
	requireRole(["OWNER"]),
	handleGetSettings,
);

settingsRouter.patch(
	"/api/v1/admin/settings",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", updateSettingsSchema),
	handleUpdateSettings,
);

settingsRouter.post(
	"/api/v1/admin/settings/reset",
	requireAuth,
	requireRole(["OWNER"]),
	handleResetSettings,
);
