import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	CreateAdminFeePeriodInput,
	CreateProfitPeriodInput,
	GetAdminFeesQuery,
	GetPaymentSummaryQuery,
	GetProfitReportQuery,
	UpdateAdminFeePeriodInput,
} from "./reports.schema.js";
import * as reportsService from "./reports.service.js";

export async function handleGetProfitReport(req: Request, res: Response) {
	const query = req.query as unknown as GetProfitReportQuery;
	const result = await reportsService.getProfitReport(query);
	return sendSuccess(res, result);
}

export async function handleCreateProfitPeriod(req: Request, res: Response) {
	const input = req.body as CreateProfitPeriodInput;
	const result = await reportsService.createProfitPeriod(input);
	return sendCreated(res, result);
}

export async function handleDeleteProfitPeriod(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await reportsService.deleteProfitPeriod(id);
	return sendSuccess(res, result);
}

export async function handleGetAdminFeeReport(req: Request, res: Response) {
	const query = req.query as unknown as GetAdminFeesQuery;
	const result = await reportsService.getAdminFeeReport(query);
	return sendSuccess(res, result);
}

export async function handleCreateAdminFeePeriod(req: Request, res: Response) {
	const input = req.body as CreateAdminFeePeriodInput;
	const result = await reportsService.createAdminFeePeriod(input);
	return sendCreated(res, result);
}

export async function handleUpdateAdminFeePeriod(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as UpdateAdminFeePeriodInput;
	const result = await reportsService.updateAdminFeePeriod(id, input);
	return sendSuccess(res, result);
}

export async function handleDeleteAdminFeePeriod(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await reportsService.deleteAdminFeePeriod(id);
	return sendSuccess(res, result);
}

export async function handleGetPaymentSummaryReport(
	req: Request,
	res: Response,
) {
	const query = req.query as unknown as GetPaymentSummaryQuery;
	const result = await reportsService.getPaymentSummaryReport(query);
	return sendSuccess(res, result);
}
