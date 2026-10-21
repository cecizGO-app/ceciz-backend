import type { Request, Response } from "express";
import { AppError } from "../../../lib/errors.js";
import { sendSuccess } from "../../../lib/response.js";
import { getBuyerBatchById, getBuyerBatches } from "./batches.service.js";

export async function handleGetBuyerBatches(req: Request, res: Response) {
	const result = await getBuyerBatches(req.query as never);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetBuyerBatchById(req: Request, res: Response) {
	const id = req.params.id as string;
	const batch = await getBuyerBatchById(id);
	if (!batch) throw AppError.notFound("Batch tidak ditemukan");
	return sendSuccess(res, batch);
}
