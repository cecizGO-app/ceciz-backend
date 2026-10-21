import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetProfile,
	handleOnboarding,
	handleUpdateProfile,
} from "./profile.controller.js";
import { updateProfileSchema } from "./profile.schema.js";

export const profileRouter: Router = Router();

profileRouter.get(
	"/api/v1/buyer/me",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetProfile,
);

profileRouter.patch(
	"/api/v1/buyer/me",
	requireAuth,
	requireRole(["BUYER"]),
	validate("body", updateProfileSchema),
	handleUpdateProfile,
);

profileRouter.patch(
	"/api/v1/buyer/me/onboarding",
	requireAuth,
	requireRole(["BUYER"]),
	handleOnboarding,
);
