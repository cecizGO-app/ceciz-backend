import type { Request, Response } from "express";
import { AppError } from "@/lib/errors";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	CreateCashflowInput,
	GetCashflowQuery,
	GetCashflowStatsQuery,
	UpdateCashflowInput,
} from "./cashflow.schema.js";
import * as cashflowService from "./cashflow.service.js";

export async function handleGetCashflowStats(req: Request, res: Response) {
	const query = req.query as unknown as GetCashflowStatsQuery;
	const result = await cashflowService.getCashflowStats(query);
	return sendSuccess(res, result);
}

export async function handleGetCashflowEntries(req: Request, res: Response) {
	const query = req.query as unknown as GetCashflowQuery;
	const { data, meta } = await cashflowService.getCashflowEntries(query);
	return sendSuccess(res, data, 200, meta);
}

export async function handleCreateCashflowEntry(req: Request, res: Response) {
	const userId = req.user?.id;
	if (!userId) throw AppError.unauthorized();
	const input = req.body as CreateCashflowInput;
	const result = await cashflowService.createCashflowEntry(input, userId);
	return sendCreated(res, result);
}

export async function handleUpdateCashflowEntry(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as UpdateCashflowInput;
	const result = await cashflowService.updateCashflowEntry(id, input);
	return sendSuccess(res, result);
}

export async function handleDeleteCashflowEntry(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await cashflowService.deleteCashflowEntry(id);
	return sendSuccess(res, result);
}
