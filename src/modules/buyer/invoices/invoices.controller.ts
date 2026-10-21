import type { Request, Response } from "express";
import { AppError } from "../../../lib/errors.js";
import { sendSuccess } from "../../../lib/response.js";
import { getInvoiceById, getInvoices } from "./invoices.service.js";

export async function handleGetInvoices(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getInvoices(buyerId, req.query as never);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetInvoiceById(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const id = req.params.id as string;
	const invoice = await getInvoiceById(buyerId, id);
	if (!invoice) throw AppError.notFound("Invoice tidak ditemukan");
	return sendSuccess(res, invoice);
}
