import { z } from "zod";

export const createBatchSchema = z.object({
	countryCode: z.enum(["CH", "KR", "TH", "JP", "INA"], {
		error: "Kode Negara harus CH, KR, TH, JP, atau INA",
	}),
	batchNumber: z
		.number()
		.int()
		.positive("Nomor batch harus angka bulat positif"),
	batchDate: z.date("Format tanggal harus YYYY-MM-DD"),
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
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>;

export const updateBatchSchema = createBatchSchema.partial().extend({
	status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]),
});

export type UpdateBatchInput = z.infer<typeof updateBatchSchema>;
