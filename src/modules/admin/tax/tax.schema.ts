import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getTaxInvoicesAdminQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	status: emptyStringToUndefined(
		z.enum(["ALL", "UNPAID", "PENDING", "PAID", "OVERDUE"]).optional(),
	),
	period: emptyStringToUndefined(z.string().trim().optional()),
	country: emptyStringToUndefined(z.string().trim().optional()),
	page: emptyStringToUndefined(z.coerce.number().int().positive().default(1)),
	limit: emptyStringToUndefined(z.coerce.number().int().positive().default(20)),
});

export type GetTaxInvoicesAdminQuery = z.infer<
	typeof getTaxInvoicesAdminQuerySchema
>;

export const releaseTaxItemInputSchema = z.object({
	itemId: z.string().trim().min(1),
	buyerId: z.string().trim().min(1),
	batchId: z.string().trim().min(1),
	item: z.string().trim().min(1),
	pcs: z.coerce.number().int().positive().default(1),
	category: z.string().trim().default("PC"),
	rateAcuan: z.coerce.number().nonnegative(),
	rateLabel: z.string().trim().optional(),
	subtotal: z.coerce.number().nonnegative(),
});

export type ReleaseTaxItemInput = z.infer<typeof releaseTaxItemInputSchema>;

export const releaseTaxSchema = z.object({
	releaseName: z
		.string()
		.trim()
		.min(1, "Nama rilis tagihan wajib diisi")
		.max(100, "Nama rilis maksimal 100 karakter"),
	releasePeriod: z
		.string()
		.trim()
		.min(1, "Periode rilis tagihan wajib diisi")
		.max(50, "Periode maksimal 50 karakter"),
	deadlinePayment: emptyStringToUndefined(z.coerce.date().optional()),
	maxCheckoutDate: emptyStringToUndefined(z.coerce.date().optional()),
	notes: emptyStringToUndefined(z.string().trim().max(500).optional()),
	items: z.array(releaseTaxItemInputSchema).optional(),
});

export type ReleaseTaxInput = z.infer<typeof releaseTaxSchema>;

export const getTaxPaymentsAdminQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	status: emptyStringToUndefined(
		z.enum(["ALL", "PENDING", "APPROVED", "REJECTED"]).optional(),
	),
	page: emptyStringToUndefined(z.coerce.number().int().positive().default(1)),
	limit: emptyStringToUndefined(z.coerce.number().int().positive().default(20)),
});

export type GetTaxPaymentsAdminQuery = z.infer<
	typeof getTaxPaymentsAdminQuerySchema
>;

export const verifyTaxPaymentSchema = z
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

export type VerifyTaxPaymentInput = z.infer<typeof verifyTaxPaymentSchema>;

export const bulkVerifyTaxPaymentSchema = z
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

export type BulkVerifyTaxPaymentInput = z.infer<
	typeof bulkVerifyTaxPaymentSchema
>;
