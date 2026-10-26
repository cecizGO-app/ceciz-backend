import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import type {
	GetTrackingQueryInput,
	UpdateTrackingInput,
} from "./tracking.schema.js";
import * as trackingService from "./tracking.service.js";

export async function handleGetTrackingStats(_req: Request, res: Response) {
	const result = await trackingService.getTrackingStats();
	return sendSuccess(res, result);
}

export async function handleGetAllTracking(req: Request, res: Response) {
	const query = req.query as unknown as GetTrackingQueryInput;
	const { data, pagination } = await trackingService.getAllTracking(query);
	return sendSuccess(res, data, 200, pagination);
}

export async function handleGetTrackingByBatchId(req: Request, res: Response) {
	const batchId = req.params.batchId as string;
	const result = await trackingService.getTrackingByBatchId(batchId);
	return sendSuccess(res, result);
}

export async function handleUpdateTracking(req: Request, res: Response) {
	const batchId = req.params.batchId as string;
	const input = req.body as UpdateTrackingInput;
	const result = await trackingService.updateTracking(batchId, input);
	return sendSuccess(res, result);
}
