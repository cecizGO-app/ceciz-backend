import type { Request, Response } from "express";
import { AppError } from "../../../lib/errors.js";
import { sendCreated, sendSuccess } from "../../../lib/response.js";
import { uploadTaxPaymentSchema } from "./tax.schema.js";
import {
	getTaxInvoiceById,
	getTaxInvoices,
	getTaxPayments,
	uploadTaxPayment,
} from "./tax.service.js";

export async function handleGetTaxInvoices(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getTaxInvoices(buyerId, req.query as never);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetTaxInvoiceById(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const id = req.params.id as string;
	const inv = await getTaxInvoiceById(buyerId, id);
	if (!inv) throw AppError.notFound("Tagihan tax tidak ditemukan");
	return sendSuccess(res, inv);
}

export async function handleUploadTaxPayment(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const taxInvoiceId = req.params.id as string;
	const file = req.file;

	if (!file) {
		return res.status(400).json({
			success: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "File bukti bayar wajib diunggah",
			},
		});
	}

	const parsed = uploadTaxPaymentSchema.safeParse(req.body);
	if (!parsed.success) {
		const details = parsed.error.issues.map((i) => ({
			field: i.path.join("."),
			message: i.message,
		}));
		return res.status(400).json({
			success: false,
			error: { code: "VALIDATION_ERROR", message: "Validasi gagal", details },
		});
	}

	const payment = await uploadTaxPayment(
		buyerId,
		taxInvoiceId,
		file,
		parsed.data,
	);
	return sendCreated(res, payment);
}

export async function handleGetTaxPayments(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const id = req.params.id as string;
	const payments = await getTaxPayments(buyerId, id);
	return sendSuccess(res, payments);
}
