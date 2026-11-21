import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	CreateStaffInput,
	UpdateRolePermissionsInput,
	UpdateStaffInput,
} from "./roles.schema.js";
import * as rolesService from "./roles.service.js";

export async function handleGetStaffAccounts(_req: Request, res: Response) {
	const result = await rolesService.getStaffAccounts();
	return sendSuccess(res, result);
}

export async function handleCreateStaffAccount(req: Request, res: Response) {
	const input = req.body as CreateStaffInput;
	const result = await rolesService.createStaffAccount(input);
	return sendCreated(res, result);
}

export async function handleUpdateStaffAccount(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as UpdateStaffInput;
	const result = await rolesService.updateStaffAccount(id, input);
	return sendSuccess(res, result);
}

export async function handleDeleteStaffAccount(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await rolesService.deleteStaffAccount(id, req.user?.id);
	return sendSuccess(res, result);
}

export async function handleGetRolePermissions(_req: Request, res: Response) {
	const result = await rolesService.getRolePermissions();
	return sendSuccess(res, result);
}

export async function handleUpdateRolePermissions(req: Request, res: Response) {
	const input = req.body as UpdateRolePermissionsInput;
	const result = await rolesService.updateRolePermissions(input);
	return sendSuccess(res, result);
}
