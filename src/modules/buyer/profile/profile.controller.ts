import type { Request, Response } from "express";
import { AppError } from "../../../lib/errors.js";
import { sendSuccess } from "../../../lib/response.js";
import { getProfile, setOnboarded, updateProfile } from "./profile.service.js";

export async function handleGetProfile(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const profile = await getProfile(buyerId);
	return sendSuccess(res, profile);
}

export async function handleUpdateProfile(req: Request, res: Response) {
	const buyerId = req.user!.id;

	if ("email" in req.body) {
		throw AppError.badRequest("Email tidak dapat diubah");
	}

	const updated = await updateProfile(buyerId, req.body);
	return sendSuccess(res, updated);
}

export async function handleOnboarding(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await setOnboarded(buyerId);
	return sendSuccess(res, result);
}
