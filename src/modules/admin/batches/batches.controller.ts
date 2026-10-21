import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../../../lib/response.js";
import type {
	CreateBatchInput,
	GetBatchQueryInput,
	UpdateBatchInput,
} from "./batches.schema.js";
import * as batchesService from "./batches.service.js";

export async function handleCreateBatch(req: Request, res: Response) {
	const input = req.body as CreateBatchInput;
	const result = await batchesService.createBatch(input);
	return sendCreated(res, result);
}

export async function handleUpdateBatch(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as UpdateBatchInput;
	const result = await batchesService.updateBatch(id, input);
	return sendSuccess(res, result);
}

export async function handleGetBatchStats(_req: Request, res: Response) {
	const result = await batchesService.getBatchStats();
	return sendSuccess(res, result);
}

export async function handleGetBatches(req: Request, res: Response) {
	const query = req.query as unknown as GetBatchQueryInput;
	const { data, pagination } = await batchesService.getBatches(query);
	return sendSuccess(res, data, 200, pagination);
}

export async function handleGetBatchById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await batchesService.getBatchById(id);
	return sendSuccess(res, result);
}

export async function handleDeleteBatch(req: Request, res: Response) {
	const id = req.params.id as string;
	await batchesService.deleteBatch(id);
	return sendSuccess(res, null);
}
