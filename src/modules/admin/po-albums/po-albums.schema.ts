import { z } from "zod";
import {
	PaymentMethod,
	PoCoStatus,
	PoOrderType,
	TrackingStatus,
} from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getPoAlbumsQuerySchema = z.object({
	search: emptyStringToUndefined(z.string().trim().optional()),
	paymentStatus: emptyStringToUndefined(
		z.enum(["ALL", "DP_PENDING", "AWAITING_FP", "PAID"]).optional(),
	),
	coStatus: emptyStringToUndefined(
		z
			.enum(["ALL", "NOT_STARTED", "CO_OPEN", "ORDER_SUBMITTED", "COMPLETED"])
			.optional(),
	),
	orderType: emptyStringToUndefined(
		z.enum(["ALL", "PO_ALBUM", "CO_WEB"]).optional(),
	),
	country: emptyStringToUndefined(
		z.enum(["CH", "KR", "TH", "JP", "INA"]).optional(),
	),
	page: emptyStringToUndefined(z.coerce.number().int().positive().default(1)),
	limit: emptyStringToUndefined(
		z.coerce.number().int().positive().max(100).default(20),
	),
});

export type GetPoAlbumsQuery = z.infer<typeof getPoAlbumsQuerySchema>;

export const createPoAlbumItemSchema = z.object({
	buyerId: z.string().trim().min(1, "Buyer wajib diisi"),
	buyerName: emptyStringToUndefined(z.string().trim().optional()),
	memberName: emptyStringToUndefined(z.string().trim().max(100).optional()),
	qty: z.coerce.number().int().positive().default(1),
	harga: z.coerce.number().nonnegative("Harga satuan tidak boleh negatif"),
	dpAmount: z.coerce.number().nonnegative("Nominal DP tidak boleh negatif"),
	dpMethod: emptyStringToUndefined(z.nativeEnum(PaymentMethod).optional()),
	dpPaid: z.boolean().default(false),
	fpAmount: z.coerce.number().nonnegative().nullable().optional(),
	fpMethod: emptyStringToUndefined(
		z.nativeEnum(PaymentMethod).nullable().optional(),
	),
	fpPaid: z.boolean().default(false),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type CreatePoAlbumItemInput = z.infer<typeof createPoAlbumItemSchema>;

export const createPoAlbumsSchema = z.object({
	batchNumber: z
		.string()
		.trim()
		.min(1, "Nomor batch wajib diisi")
		.max(50, "Nomor batch maksimal 50 karakter"),
	itemName: z
		.string()
		.trim()
		.min(1, "Item / judul album wajib diisi")
		.max(200, "Judul album maksimal 200 karakter"),
	orderType: z.nativeEnum(PoOrderType).default(PoOrderType.PO_ALBUM),
	coStatus: z.nativeEnum(PoCoStatus).default(PoCoStatus.NOT_STARTED),
	trackingStatus: z.nativeEnum(TrackingStatus).default(TrackingStatus.PO),
	items: z
		.array(createPoAlbumItemSchema)
		.min(1, "Minimal 1 baris pesanan wajib diisi"),
});

export type CreatePoAlbumsInput = z.infer<typeof createPoAlbumsSchema>;

export const updatePoAlbumSchema = z.object({
	batchNumber: emptyStringToUndefined(
		z.string().trim().min(1).max(50).optional(),
	),
	itemName: emptyStringToUndefined(
		z.string().trim().min(1).max(200).optional(),
	),
	orderType: emptyStringToUndefined(z.nativeEnum(PoOrderType).optional()),
	memberName: emptyStringToUndefined(
		z.string().trim().max(100).nullable().optional(),
	),
	qty: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
	harga: emptyStringToUndefined(z.coerce.number().nonnegative().optional()),
	dpAmount: emptyStringToUndefined(z.coerce.number().nonnegative().optional()),
	dpMethod: emptyStringToUndefined(
		z.nativeEnum(PaymentMethod).nullable().optional(),
	),
	dpPaid: z.boolean().optional(),
	fpAmount: z.coerce.number().nonnegative().nullable().optional(),
	fpMethod: emptyStringToUndefined(
		z.nativeEnum(PaymentMethod).nullable().optional(),
	),
	fpPaid: z.boolean().optional(),
	coStatus: emptyStringToUndefined(z.nativeEnum(PoCoStatus).optional()),
	trackingStatus: emptyStringToUndefined(
		z.nativeEnum(TrackingStatus).optional(),
	),
	notes: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
});

export type UpdatePoAlbumInput = z.infer<typeof updatePoAlbumSchema>;
