import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import { getBatchHistory, getPaymentHistory } from "./history.service.js";
import type { GetHistoryQuery } from "./history.schema.js";

export async function handleGetBatchHistory(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getBatchHistory(
		buyerId,
		req.query as unknown as GetHistoryQuery,
	);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetPaymentHistory(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getPaymentHistory(
		buyerId,
		req.query as unknown as GetHistoryQuery,
	);
	return sendSuccess(res, result.data, 200, result.meta);
}
