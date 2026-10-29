import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import { getTrackingById, getTrackings } from "./tracking.service.js";
import type { GetTrackingQuery } from "./tracking.schema.js";

export async function handleGetTrackings(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getTrackings(buyerId, req.query as unknown as GetTrackingQuery);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetTrackingById(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const trackingId = req.params.id as string;
	const tracking = await getTrackingById(buyerId, trackingId);
	return sendSuccess(res, tracking);
}
