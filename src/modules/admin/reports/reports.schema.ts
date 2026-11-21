import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getProfitReportQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	period: emptyStringToUndefined(z.string().trim().optional()),
	country: emptyStringToUndefined(
		z.enum(["CH", "KR", "TH", "JP", "INA"]).optional(),
	),
	batchId: emptyStringToUndefined(z.string().trim().optional()),
});

export type GetProfitReportQuery = z.infer<typeof getProfitReportQuerySchema>;

export const createProfitPeriodSchema = z.object({
	periodName: z
		.string()
		.trim()
		.min(1, "Nama periode wajib diisi")
		.max(100, "Nama periode maksimal 100 karakter"),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	batchIds: z.array(z.string().trim().min(1)).min(1, "Pilih minimal 1 batch"),
	packingCost: z.coerce.number().nonnegative().default(0),
	otherCost: z.coerce.number().nonnegative().default(0),
	otherCostNote: emptyStringToUndefined(
		z.string().trim().max(300).nullable().optional(),
	),
	adminAPercent: z.coerce.number().int().min(0).max(100).default(80),
	adminBPercent: z.coerce.number().int().min(0).max(100).default(20),
	goSavingsPercent: z.coerce.number().int().min(0).max(100).default(0),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type CreateProfitPeriodInput = z.infer<typeof createProfitPeriodSchema>;

export const getAdminFeesQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	adminName: emptyStringToUndefined(z.string().trim().optional()),
	period: emptyStringToUndefined(z.string().trim().optional()),
});

export type GetAdminFeesQuery = z.infer<typeof getAdminFeesQuerySchema>;

export const createAdminFeePeriodSchema = z.object({
	periodName: z
		.string()
		.trim()
		.min(1, "Periode wajib diisi")
		.max(100, "Periode maksimal 100 karakter"),
	adminName: z
		.string()
		.trim()
		.min(1, "Nama admin wajib diisi")
		.max(100, "Nama admin maksimal 100 karakter"),
	batchCount: z.coerce.number().int().nonnegative().default(0),
	batchIds: z.array(z.string().trim().min(1)).default([]),
	feeNyelem: z.coerce.number().nonnegative().default(0),
	feeRekap: z.coerce.number().nonnegative().default(0),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type CreateAdminFeePeriodInput = z.infer<
	typeof createAdminFeePeriodSchema
>;

export const updateAdminFeePeriodSchema = z.object({
	periodName: emptyStringToUndefined(
		z.string().trim().min(1).max(100).optional(),
	),
	adminName: emptyStringToUndefined(
		z.string().trim().min(1).max(100).optional(),
	),
	batchCount: emptyStringToUndefined(
		z.coerce.number().int().nonnegative().optional(),
	),
	batchIds: z.array(z.string().trim().min(1)).optional(),
	feeNyelem: emptyStringToUndefined(z.coerce.number().nonnegative().optional()),
	feeRekap: emptyStringToUndefined(z.coerce.number().nonnegative().optional()),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type UpdateAdminFeePeriodInput = z.infer<
	typeof updateAdminFeePeriodSchema
>;

export const getPaymentSummaryQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	period: emptyStringToUndefined(z.string().trim().optional()),
});

export type GetPaymentSummaryQuery = z.infer<
	typeof getPaymentSummaryQuerySchema
>;
