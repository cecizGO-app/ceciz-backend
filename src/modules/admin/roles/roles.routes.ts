import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreateStaffAccount,
	handleDeleteStaffAccount,
	handleGetRolePermissions,
	handleGetStaffAccounts,
	handleUpdateRolePermissions,
	handleUpdateStaffAccount,
} from "./roles.controller.js";
import {
	createStaffSchema,
	updateRolePermissionsSchema,
	updateStaffSchema,
} from "./roles.schema.js";

export const rolesRouter: Router = Router();

// Seluruh endpoint Roles & Permissions KHUSUS OWNER
rolesRouter.get(
	"/api/v1/admin/roles/staff",
	requireAuth,
	requireRole(["OWNER"]),
	handleGetStaffAccounts,
);

rolesRouter.post(
	"/api/v1/admin/roles/staff",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", createStaffSchema),
	handleCreateStaffAccount,
);

rolesRouter.patch(
	"/api/v1/admin/roles/staff/:id",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", updateStaffSchema),
	handleUpdateStaffAccount,
);

rolesRouter.delete(
	"/api/v1/admin/roles/staff/:id",
	requireAuth,
	requireRole(["OWNER"]),
	handleDeleteStaffAccount,
);

rolesRouter.get(
	"/api/v1/admin/roles/permissions",
	requireAuth,
	requireRole(["OWNER"]),
	handleGetRolePermissions,
);

rolesRouter.patch(
	"/api/v1/admin/roles/permissions",
	requireAuth,
	requireRole(["OWNER"]),
	validate("body", updateRolePermissionsSchema),
	handleUpdateRolePermissions,
);
