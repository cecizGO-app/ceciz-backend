import { z } from "zod";
import { CashflowType, PaymentMethod } from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getCashflowQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	type: emptyStringToUndefined(z.enum(["ALL", "INCOME", "EXPENSE"]).optional()),
	category: emptyStringToUndefined(z.string().trim().optional()),
	paymentMethod: emptyStringToUndefined(
		z.enum(["ALL", "BCA", "QRIS", "SEABANK", "SPAY", "CASH"]).optional(),
	),
	startDate: emptyStringToUndefined(z.coerce.date().optional()),
	endDate: emptyStringToUndefined(z.coerce.date().optional()),
	page: emptyStringToUndefined(z.coerce.number().int().positive().default(1)),
	limit: emptyStringToUndefined(
		z.coerce.number().int().positive().max(100).default(20),
	),
});

export type GetCashflowQuery = z.infer<typeof getCashflowQuerySchema>;

export const getCashflowStatsQuerySchema = z.object({
	startDate: emptyStringToUndefined(z.coerce.date().optional()),
	endDate: emptyStringToUndefined(z.coerce.date().optional()),
});

export type GetCashflowStatsQuery = z.infer<typeof getCashflowStatsQuerySchema>;

export const createCashflowSchema = z.object({
	entryDate: z.coerce.date(),
	type: z.nativeEnum(CashflowType),
	amount: z.coerce.number().positive("Nominal harus lebih dari 0"),
	category: emptyStringToUndefined(
		z.string().trim().min(1, "Kategori wajib diisi").max(100),
	),
	paymentMethod: emptyStringToUndefined(z.nativeEnum(PaymentMethod).optional()),
	description: z
		.string()
		.trim()
		.min(1, "Deskripsi wajib diisi")
		.max(300, "Deskripsi maksimal 300 karakter"),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type CreateCashflowInput = z.infer<typeof createCashflowSchema>;

export const updateCashflowSchema = z.object({
	entryDate: emptyStringToUndefined(z.coerce.date().optional()),
	type: emptyStringToUndefined(z.nativeEnum(CashflowType).optional()),
	amount: emptyStringToUndefined(
		z.coerce.number().positive("Nominal harus lebih dari 0").optional(),
	),
	category: emptyStringToUndefined(z.string().trim().max(100).optional()),
	paymentMethod: emptyStringToUndefined(
		z.nativeEnum(PaymentMethod).nullable().optional(),
	),
	description: emptyStringToUndefined(
		z.string().trim().min(1).max(300).optional(),
	),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type UpdateCashflowInput = z.infer<typeof updateCashflowSchema>;
