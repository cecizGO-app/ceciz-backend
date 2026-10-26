import { z } from "zod";
import { BatchStatus, CountryCode, Role } from "@/generated/prisma/enums";

export const batchItemInputSchema = z.object({
	buyerId: z.string().trim().min(1, "Buyer ID wajib diisi"),
	buyerName: z.string().trim().optional(),
	description: z.string().trim().min(1, "Nama/Varian merch wajib diisi"),
	hargaAsli: z.coerce.number().positive("Harga asli harus lebih dari 0"),
	pcs: z.coerce.number().int().positive().default(1),
	feeNyelem: z.coerce.number().nonnegative().nullable().optional(),
	hargaPerBuyer: z.coerce.number().nonnegative().nullable().optional(),
	hargaJualPerBuyer: z.coerce.number().nonnegative().nullable().optional(),
});

export type BatchItemInput = z.infer<typeof batchItemInputSchema>;

export const createBatchSchema = z.object({
	countryCode: z.enum(["CH", "KR", "TH", "JP", "INA"], {
		message: "Kode Negara harus CH, KR, TH, JP, atau INA",
	}),
	batchNumber: z.coerce
		.number()
		.int()
		.positive("Nomor batch harus angka bulat positif"),
	batchDate: z.coerce.date({ message: "Format tanggal harus YYYY-MM-DD" }),
	title: z
		.string()
		.trim()
		.min(1, "Judul batch wajib diisi")
		.max(100, "Judul batch maksimal 100 karakter"),
	description: z
		.string()
		.trim()
		.max(500, "Deskripsi maksimal 500 karakter")
		.nullable()
		.optional(),
	whName: z.string().trim().nullable().optional(),
	shippingFee: z.coerce.number().nonnegative().nullable().optional(),
	feeGo: z.coerce.number().nonnegative().default(0),
	feeRekap: z.coerce.number().nonnegative().default(0),
	feeNyelem: z.coerce.number().nonnegative().default(0),
	rateHarian: z.coerce
		.number()
		.positive("Rate harian harus bernilai positif")
		.nullable()
		.optional(),
	feeWh: z.coerce.number().nonnegative().nullable().optional(),
	feeProxy: z.coerce.number().nonnegative().nullable().optional(),
	adminNyelemId: z.string().trim().nullable().optional(),
	proxyCoName: z.string().trim().nullable().optional(),
	status: z.enum(BatchStatus).optional(),
	hargaTotal: z.coerce.number().nullable().optional(),
	hargaTfSeller: z.coerce.number().nullable().optional(),
	selisihHarga: z.coerce.number().nullable().optional(),
	labaBersih: z.coerce.number().nullable().optional(),
	items: z.array(batchItemInputSchema).optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = createBatchSchema.partial();

export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getBatchQuerySchema = z.object({
	countryCode: emptyStringToUndefined(z.enum(CountryCode).optional()),
	status: emptyStringToUndefined(z.enum(BatchStatus).optional()),
	search: emptyStringToUndefined(z.string().trim().optional()),
	whName: emptyStringToUndefined(z.string().trim().optional()),
	includeArchived: emptyStringToUndefined(
		z
			.union([z.boolean(), z.enum(["true", "false"])])
			.transform((val) => val === true || val === "true")
			.optional(),
	),
	page: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
	limit: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
});

export type GetBatchQueryInput = z.infer<typeof getBatchQuerySchema>;

export const getAdminUsersQuerySchema = z.object({
	role: emptyStringToUndefined(z.enum(Role).optional()),
	search: emptyStringToUndefined(z.string().trim().optional()),
});

export type GetAdminUsersQueryInput = z.infer<typeof getAdminUsersQuerySchema>;

export const getNextBatchNumberQuerySchema = z.object({
	countryCode: z.enum(CountryCode, {
		message: "Kode Negara harus CH, KR, TH, JP, atau INA",
	}),
});

export type GetNextBatchNumberQueryInput = z.infer<
	typeof getNextBatchNumberQuerySchema
>;
