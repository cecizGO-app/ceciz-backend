import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import type { UpdateSettingsInput } from "./settings.schema.js";
import * as settingsService from "./settings.service.js";

export async function handleGetSettings(_req: Request, res: Response) {
	const result = await settingsService.getSettings();
	return sendSuccess(res, result);
}

export async function handleUpdateSettings(req: Request, res: Response) {
	const input = req.body as UpdateSettingsInput;
	const result = await settingsService.updateSettings(input);
	return sendSuccess(res, result);
}

export async function handleResetSettings(_req: Request, res: Response) {
	const result = await settingsService.resetSettingsToDefault();
	return sendSuccess(res, result);
}
