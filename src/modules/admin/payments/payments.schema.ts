import { z } from "zod";
import { PaymentMethod, VerificationStatus } from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getPaymentQuerySchema = z.object({
	status: emptyStringToUndefined(z.enum(VerificationStatus).optional()),
	paymentMethod: emptyStringToUndefined(z.enum(PaymentMethod).optional()),
	batchId: emptyStringToUndefined(z.string().trim().optional()),
	search: emptyStringToUndefined(z.string().trim().optional()),
	timeRange: emptyStringToUndefined(
		z.enum(["today", "this_week", "this_month", "all"]).optional(),
	),
	startDate: emptyStringToUndefined(z.coerce.date().optional()),
	endDate: emptyStringToUndefined(z.coerce.date().optional()),
	page: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
	limit: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
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

export const createPaymentSchema = z
	.object({
		invoiceId: z.string().trim().optional(),
		batchId: z.string().trim().optional(),
		buyerId: z.string().trim().min(1, "Buyer ID wajib diisi"),
		amount: z.coerce.number().positive("Nominal harus bernilai positif"),
		paymentMethod: z.enum(PaymentMethod, {
			message: "Metode pembayaran tidak valid",
		}),
		paymentDate: z.coerce.date().default(() => new Date()),
		paymentProofUrl: z.string().trim().optional().default(""),
		status: z.enum(["PENDING", "APPROVED"]).default("APPROVED"),
		notes: z.string().trim().max(500).optional(),
	})
	.refine((data) => Boolean(data.invoiceId) || Boolean(data.batchId), {
		message: "invoiceId atau batchId wajib diisi",
		path: ["batchId"],
	});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const invoiceLookupQuerySchema = z.object({
	buyerId: z.string().trim().min(1, "Buyer ID wajib diisi"),
	batchId: z.string().trim().min(1, "Batch ID wajib diisi"),
});

export type InvoiceLookupQueryInput = z.infer<typeof invoiceLookupQuerySchema>;
