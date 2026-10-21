import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	BulkVerifyPaymentInput,
	CreatePaymentInput,
	GetPaymentQueryInput,
	VerifyPaymentInput,
} from "./payments.schema.js";
import * as paymentsService from "./payments.service.js";

export async function handleGetPaymentStats(_req: Request, res: Response) {
	const result = await paymentsService.getPaymentStats();
	return sendSuccess(res, result);
}

export async function handleGetPayments(req: Request, res: Response) {
	const query = req.query as unknown as GetPaymentQueryInput;
	const { data, pagination } = await paymentsService.getPayments(query);
	return sendSuccess(res, data, 200, pagination);
}

export async function handleGetPaymentById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await paymentsService.getPaymentById(id);
	return sendSuccess(res, result);
}

export async function handleVerifyPayment(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as VerifyPaymentInput;
	const result = await paymentsService.verifyPayment(id, input, req.user?.id);
	return sendSuccess(res, result);
}

export async function handleBulkVerifyPayments(req: Request, res: Response) {
	const input = req.body as BulkVerifyPaymentInput;
	const result = await paymentsService.bulkVerifyPayments(input, req.user?.id);
	return sendSuccess(res, result);
}

export async function handleCreatePayment(req: Request, res: Response) {
	const input = req.body as CreatePaymentInput;
	const result = await paymentsService.createPayment(input, req.user?.id);
	return sendCreated(res, result);
}

export async function handleUploadPaymentProof(req: Request, res: Response) {
	const result = await paymentsService.uploadPaymentProof(req.file);
	return sendSuccess(res, result);
}
