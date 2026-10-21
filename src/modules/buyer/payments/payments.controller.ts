import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import { uploadPaymentSchema } from "./payments.schema.js";
import { getBatchPayments, uploadBatchPayment } from "./payments.service.js";

export async function handleUploadPayment(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const invoiceId = req.params.id as string;
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

	const parsed = uploadPaymentSchema.safeParse(req.body);
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

	const payment = await uploadBatchPayment(
		buyerId,
		invoiceId,
		file,
		parsed.data,
	);
	return sendCreated(res, payment);
}

export async function handleGetBatchPayments(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const invoiceId = req.params.id as string;
	const payments = await getBatchPayments(buyerId, invoiceId);
	return sendSuccess(res, payments);
}
