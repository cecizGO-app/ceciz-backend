import { z } from "zod";
import { BatchStatus, CountryCode } from "../generated/prisma/enums.js";

export const batchItemInputSchema = z.object({
	buyerId: z.string().trim().min(1, "Buyer ID wajib diisi"),
	buyerName: z.string().trim().optional(),
	description: z.string().trim().min(1, "Nama/Varian merch wajib diisi"),
	hargaAsli: z.number().positive("Harga asli harus lebih dari 0"),
	pcs: z.number().int().positive().default(1),
	feeNyelem: z.number().nonnegative().optional(),
	hargaPerBuyer: z.number().nonnegative().optional(),
	hargaJualPerBuyer: z.number().nonnegative().optional(),
});

export type batchItemInput = z.infer<typeof batchItemInputSchema>;

export const createBatchSchema = z.object({
	countryCode: z.enum(["CH", "KR", "TH", "JP", "INA"], {
		message: "Kode Negara harus CH, KR, TH, JP, atau INA",
	}),
	batchNumber: z
		.number()
		.int()
		.positive("Nomor batch harus angka bulat positif"),
	batchDate: z.coerce.date({ message: "Format tanggal harus YYYY-MM-DD" }),
	title: z
		.string()
		.trim()
		.min(1, "Judul batch wajib diisi")
		.max(50, "Judul batch maksimal 50 karakter"),
	description: z
		.string()
		.trim()
		.max(250, "Deskripsi maksimal 250 karakter")
		.optional(),
	shippingFee: z.number().nonnegative().optional(),
	feeGo: z.number().nonnegative().default(0),
	feeRekap: z.number().nonnegative().default(0),
	feeNyelem: z.number().nonnegative().default(0),
	rateHarian: z
		.number()
		.positive("Rate harian harus bernilai positif")
		.optional(),
	feeWh: z.number().nonnegative().optional(),
	feeProxy: z.number().nonnegative().optional(),
	adminNyelemId: z.string().optional(),
	proxyCoName: z.string().optional(),
	items: z.array(batchItemInputSchema).optional(),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = createBatchSchema.partial().extend({
	status: z.enum(BatchStatus).optional(),
	hargaTotal: z.number().nullable().optional(),
	hargaTfSeller: z.number().nullable().optional(),
	selisihHarga: z.number().nullable().optional(),
	labaBersih: z.number().nullable().optional(),
});

export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;

export const getBatchQuerySchema = z.object({
	countryCode: z.enum(CountryCode).optional(),
	status: z.enum(BatchStatus).optional(),
	search: z.string().trim().optional(),
	whName: z.string().trim().optional(),
	includeArchived: z
		.union([z.boolean(), z.enum(["true", "false"])])
		.transform((val) => val === true || val === "true")
		.optional(),
	page: z.coerce.number().int().positive().optional(),
	limit: z.coerce.number().int().positive().optional(),
});

export type GetBatchQueryInput = z.infer<typeof getBatchQuerySchema>;
