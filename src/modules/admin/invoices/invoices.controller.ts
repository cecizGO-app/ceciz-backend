import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	GenerateInvoicesInput,
	GetInvoicesAdminQuery,
	WaivePenaltyInput,
} from "./invoices.schema.js";
import * as invoicesService from "./invoices.service.js";

export async function handleGetInvoiceStats(_req: Request, res: Response) {
	const result = await invoicesService.getInvoiceStats();
	return sendSuccess(res, result);
}

export async function handleGetInvoicePreview(req: Request, res: Response) {
	const batchId = req.params.batchId as string;
	const result = await invoicesService.getInvoicePreview(batchId);
	return sendSuccess(res, result);
}

export async function handleGenerateInvoices(req: Request, res: Response) {
	const input = req.body as GenerateInvoicesInput;
	const result = await invoicesService.generateInvoices(input);
	return sendCreated(res, result);
}

export async function handleGetInvoices(req: Request, res: Response) {
	const query = req.query as unknown as GetInvoicesAdminQuery;
	const { data, meta } = await invoicesService.getInvoices(query);
	return sendSuccess(res, data, 200, meta);
}

export async function handleGetInvoiceById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await invoicesService.getInvoiceById(id);
	return sendSuccess(res, result);
}

export async function handleWaivePenalty(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as WaivePenaltyInput;
	const result = await invoicesService.waivePenalty(id, input, req.user?.id);
	return sendSuccess(res, result);
}
