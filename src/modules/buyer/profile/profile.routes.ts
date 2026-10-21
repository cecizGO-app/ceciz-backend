import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { validate } from "../../../middleware/validate.js";
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
	requireBuyer,
	handleGetProfile,
);

profileRouter.patch(
	"/api/v1/buyer/me",
	requireAuth,
	requireBuyer,
	validate("body", updateProfileSchema),
	handleUpdateProfile,
);

profileRouter.patch(
	"/api/v1/buyer/me/onboarding",
	requireAuth,
	requireBuyer,
	handleOnboarding,
);
