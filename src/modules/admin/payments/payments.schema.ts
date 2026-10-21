import { z } from "zod";
import {
	PaymentMethod,
	VerificationStatus,
} from "../../../generated/prisma/enums.js";

export const getPaymentQuerySchema = z.object({
	status: z.enum(VerificationStatus).optional(),
	paymentMethod: z.enum(PaymentMethod).optional(),
	batchId: z.string().trim().optional(),
	search: z.string().trim().optional(),
	timeRange: z.enum(["today", "this_week", "this_month", "all"]).optional(),
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().optional(),
});

export type GetPaymentQueryInput = z.infer<typeof getPaymentQuerySchema>;

export const verifyPaymentSchema = z
	.object({
		status: z.enum(["APPROVED", "REJECTED"], {
			message: "Status harus APPROVED atau REJECTED",
		}),
		rejectReason: z.string().trim().optional(),
	})
	.refine(
		(data) => {
			if (
				data.status === "REJECTED" &&
				(!data.rejectReason || data.rejectReason.length === 0)
			) {
				return false;
			}
			return true;
		},
		{
			message:
				"Alasan penolakan (rejectReason) wajib diisi jika status REJECTED",
			path: ["rejectReason"],
		},
	);

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export const bulkVerifyPaymentSchema = z
	.object({
		paymentIds: z
			.array(z.string().min(1))
			.min(1, "Minimal pilih 1 pembayaran untuk diverifikasi"),
		status: z.enum(["APPROVED", "REJECTED"], {
			message: "Status harus APPROVED atau REJECTED",
		}),
		rejectReason: z.string().trim().optional(),
	})
	.refine(
		(data) => {
			if (
				data.status === "REJECTED" &&
				(!data.rejectReason || data.rejectReason.length === 0)
			) {
				return false;
			}
			return true;
		},
		{
			message: "Alasan penolakan wajib diisi jika status REJECTED",
			path: ["rejectReason"],
		},
	);

export type BulkVerifyPaymentInput = z.infer<typeof bulkVerifyPaymentSchema>;

export const createPaymentSchema = z.object({
	invoiceId: z.string().trim().min(1, "Invoice ID wajib diisi"),
	buyerId: z.string().trim().min(1, "Buyer ID wajib diisi"),
	amount: z.number().positive("Nominal harus bernilai positif"),
	paymentMethod: z.enum(PaymentMethod, {
		message: "Metode pembayaran tidak valid",
	}),
	paymentDate: z.coerce.date().default(() => new Date()),
	paymentProofUrl: z.string().trim().optional().default(""),
	notes: z.string().trim().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
