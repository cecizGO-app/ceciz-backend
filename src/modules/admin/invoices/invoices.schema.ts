import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getInvoicesAdminQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	status: emptyStringToUndefined(
		z
			.enum(["ALL", "UNPAID", "AWAITING_VERIFICATION", "PAID", "OVERDUE"])
			.optional(),
	),
	batchId: emptyStringToUndefined(z.string().trim().optional()),
	country: emptyStringToUndefined(
		z.enum(["CH", "KR", "TH", "JP", "INA"]).optional(),
	),
	page: emptyStringToUndefined(z.coerce.number().int().positive().default(1)),
	limit: emptyStringToUndefined(
		z.coerce.number().int().positive().max(100).default(20),
	),
});

export type GetInvoicesAdminQuery = z.infer<typeof getInvoicesAdminQuerySchema>;

export const generateInvoicesSchema = z.object({
	batchId: z.string().trim().min(1, "Batch wajib dipilih"),
	/** Deadline untuk invoice BARU. Default: sekarang + Setting.deadlineBatchHours */
	deadlinePayment: emptyStringToUndefined(z.coerce.date().optional()),
	/** Batasi generate hanya untuk buyer tertentu. Kosong = semua buyer di batch */
	buyerIds: z.array(z.string().trim().min(1)).optional(),
	/** Perbarui nominal invoice lama yang belum ada pembayaran disetujui */
	updateExisting: z.boolean().default(true),
	/** Kirim notifikasi in-app ke buyer */
	notifyBuyers: z.boolean().default(true),
});

export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export const waivePenaltySchema = z.object({
	reason: z
		.string()
		.trim()
		.min(5, "Alasan pembebasan denda minimal 5 karakter")
		.max(500, "Alasan maksimal 500 karakter"),
});

export type WaivePenaltyInput = z.infer<typeof waivePenaltySchema>;
