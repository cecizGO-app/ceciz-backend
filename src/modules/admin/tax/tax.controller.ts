import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	BulkVerifyTaxPaymentInput,
	GetTaxInvoicesAdminQuery,
	GetTaxPaymentsAdminQuery,
	ReleaseTaxInput,
	VerifyTaxPaymentInput,
} from "./tax.schema.js";
import * as taxService from "./tax.service.js";

export async function handleGetTaxStats(_req: Request, res: Response) {
	const result = await taxService.getTaxStats();
	return sendSuccess(res, result);
}

export async function handleGetTaxInvoices(req: Request, res: Response) {
	const query = req.query as unknown as GetTaxInvoicesAdminQuery;
	const { data, meta } = await taxService.getTaxInvoices(query);
	return sendSuccess(res, data, 200, meta);
}

export async function handleGetTaxInvoiceById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await taxService.getTaxInvoiceById(id);
	return sendSuccess(res, result);
}

export async function handleGetTaxPreview(_req: Request, res: Response) {
	const result = await taxService.getTaxPreview();
	return sendSuccess(res, result);
}

export async function handleReleaseTaxInvoices(req: Request, res: Response) {
	const input = req.body as ReleaseTaxInput;
	const result = await taxService.releaseTaxInvoices(input);
	return sendCreated(res, result);
}

export async function handleGetTaxPayments(req: Request, res: Response) {
	const query = req.query as unknown as GetTaxPaymentsAdminQuery;
	const { data, meta } = await taxService.getTaxPayments(query);
	return sendSuccess(res, data, 200, meta);
}

export async function handleGetTaxPaymentById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await taxService.getTaxPaymentById(id);
	return sendSuccess(res, result);
}

export async function handleVerifyTaxPayment(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as VerifyTaxPaymentInput;
	const result = await taxService.verifyTaxPayment(id, input, req.user?.id);
	return sendSuccess(res, result);
}

export async function handleBulkVerifyTaxPayments(req: Request, res: Response) {
	const input = req.body as BulkVerifyTaxPaymentInput;
	const result = await taxService.bulkVerifyTaxPayments(input, req.user?.id);
	return sendSuccess(res, result);
}
