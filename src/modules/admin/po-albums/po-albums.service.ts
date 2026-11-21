import type { Prisma } from "@/generated/prisma/client";
import { PoCoStatus, type PoOrderType, Role } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type {
	CreatePoAlbumsInput,
	GetPoAlbumsQuery,
	UpdatePoAlbumInput,
} from "./po-albums.schema.js";

// ==========================================
// Helpers
// ==========================================

function formatPoAlbumRow(row: {
	id: string;
	batchNumber: string;
	itemName: string;
	orderType: string;
	memberName: string | null;
	qty: number;
	totalQty: number | null;
	harga: Prisma.Decimal | number | string;
	totalHarga: Prisma.Decimal | number | string;
	dpAmount: Prisma.Decimal | number | string;
	dpMethod: string | null;
	dpPaid: boolean;
	fpAmount: Prisma.Decimal | number | string | null;
	fpMethod: string | null;
	fpPaid: boolean;
	coStatus: string;
	trackingStatus: string;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
	buyer: {
		id: string;
		name: string;
		email: string;
		idLine: string | null;
		contact?: string | null;
	};
}) {
	const dpAmount = Number(row.dpAmount);
	const fpAmount = row.fpAmount !== null ? Number(row.fpAmount) : null;
	const totalHarga = Number(row.totalHarga);
	const total = fpAmount !== null ? dpAmount + fpAmount : totalHarga;

	const paymentStatus =
		row.dpPaid && row.fpPaid
			? "PAID"
			: row.dpPaid
				? "AWAITING_FP"
				: "DP_PENDING";

	return {
		id: row.id,
		batchNumber: row.batchNumber,
		itemName: row.itemName,
		orderType: row.orderType,
		memberName: row.memberName,
		qty: row.qty,
		totalQty: row.totalQty,
		harga: Number(row.harga),
		totalHarga,
		dpAmount,
		dpMethod: row.dpMethod,
		dpPaid: row.dpPaid,
		fpAmount,
		fpMethod: row.fpMethod,
		fpPaid: row.fpPaid,
		total,
		paymentStatus,
		coStatus: row.coStatus,
		trackingStatus: row.trackingStatus,
		notes: row.notes,
		buyer: row.buyer,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

async function resolveOrCreateBuyer(
	tx: Prisma.TransactionClient,
	rawIdentifier: string,
	fallbackName?: string,
): Promise<string> {
	const cleaned = rawIdentifier.trim();
	const withoutAt = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;

	const existing = await tx.user.findFirst({
		where: {
			OR: [
				{ id: cleaned },
				{ idLine: { equals: withoutAt, mode: "insensitive" } },
				{ email: { equals: cleaned, mode: "insensitive" } },
			],
		},
		select: { id: true },
	});

	if (existing) return existing.id;

	const safeSlug = withoutAt
		.toLowerCase()
		.replace(/[^a-z0-9._-]/g, "_")
		.slice(0, 40);
	const created = await tx.user.create({
		data: {
			id: `buyer_${safeSlug}_${Date.now()}`,
			name: fallbackName?.trim() || withoutAt,
			idLine: withoutAt,
			email: `${safeSlug}_${Date.now()}@buyer.ceciz.local`,
			role: Role.BUYER,
			isOnboarded: true,
			isActive: true,
		},
		select: { id: true },
	});
	return created.id;
}

function buildPaymentStatusWhere(
	paymentStatus: GetPoAlbumsQuery["paymentStatus"],
): Prisma.PoAlbumWhereInput | undefined {
	switch (paymentStatus) {
		case "DP_PENDING":
			return { dpPaid: false };
		case "AWAITING_FP":
			return { dpPaid: true, fpPaid: false };
		case "PAID":
			return { dpPaid: true, fpPaid: true };
		default:
			return undefined;
	}
}

// ==========================================
// 1. Stats (4 Kartu)
// ==========================================

export async function getPoAlbumStats() {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [
		totalOrders,
		activeBatchGroups,
		awaitingFpRows,
		coOpenBatches,
		paidThisMonthRows,
	] = await Promise.all([
		prisma.poAlbum.count(),
		prisma.poAlbum.findMany({
			where: { coStatus: { not: PoCoStatus.COMPLETED } },
			distinct: ["batchNumber"],
			select: { batchNumber: true },
		}),
		prisma.poAlbum.findMany({
			where: { dpPaid: true, fpPaid: false },
			distinct: ["buyerId"],
			select: { buyerId: true },
		}),
		prisma.poAlbum.findMany({
			where: { coStatus: PoCoStatus.CO_OPEN },
			distinct: ["batchNumber"],
			select: { batchNumber: true },
		}),
		prisma.poAlbum.findMany({
			where: {
				createdAt: { gte: startOfMonth },
				OR: [{ dpPaid: true }, { fpPaid: true }],
			},
			select: {
				dpAmount: true,
				dpPaid: true,
				fpAmount: true,
				fpPaid: true,
			},
		}),
	]);

	const totalCollectedThisMonth = paidThisMonthRows.reduce((sum, row) => {
		const dp = row.dpPaid ? Number(row.dpAmount) : 0;
		const fp = row.fpPaid && row.fpAmount ? Number(row.fpAmount) : 0;
		return sum + dp + fp;
	}, 0);

	return {
		totalOrders: {
			count: totalOrders,
			activeBatches: activeBatchGroups.length,
		},
		awaitingFp: {
			buyerCount: awaitingFpRows.length,
		},
		coWebOpen: {
			batchCount: coOpenBatches.length,
		},
		collectedThisMonth: {
			amount: totalCollectedThisMonth,
		},
	};
}

// ==========================================
// 2. List & Filter
// ==========================================

export async function getPoAlbums(query: GetPoAlbumsQuery) {
	const { skip, take } = getPaginationArgs(query);

	const and: Prisma.PoAlbumWhereInput[] = [];
	const paymentWhere = buildPaymentStatusWhere(query.paymentStatus);
	if (paymentWhere) and.push(paymentWhere);
	if (query.coStatus && query.coStatus !== "ALL") {
		and.push({ coStatus: query.coStatus as PoCoStatus });
	}
	if (query.orderType && query.orderType !== "ALL") {
		and.push({ orderType: query.orderType as PoOrderType });
	}
	if (query.country) {
		and.push({
			batchNumber: { startsWith: `${query.country}-`, mode: "insensitive" },
		});
	}
	if (query.search) {
		and.push({
			OR: [
				{ batchNumber: { contains: query.search, mode: "insensitive" } },
				{ itemName: { contains: query.search, mode: "insensitive" } },
				{ memberName: { contains: query.search, mode: "insensitive" } },
				{ buyer: { name: { contains: query.search, mode: "insensitive" } } },
				{ buyer: { idLine: { contains: query.search, mode: "insensitive" } } },
				{ buyer: { email: { contains: query.search, mode: "insensitive" } } },
			],
		});
	}

	const where: Prisma.PoAlbumWhereInput = and.length ? { AND: and } : {};

	const [rows, total] = await Promise.all([
		prisma.poAlbum.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			include: {
				buyer: {
					select: { id: true, name: true, email: true, idLine: true },
				},
			},
		}),
		prisma.poAlbum.count({ where }),
	]);

	return {
		data: rows.map(formatPoAlbumRow),
		meta: buildMeta(total, query.page, query.limit),
	};
}

// ==========================================
// 3. Create (Bulk per Batch)
// ==========================================

export async function createPoAlbums(input: CreatePoAlbumsInput) {
	const totalQtyBatch = input.items.reduce((s, item) => s + item.qty, 0);

	const createdRows = await prisma.$transaction(async (tx) => {
		const results = [];
		for (const item of input.items) {
			const buyerId = await resolveOrCreateBuyer(
				tx,
				item.buyerId,
				item.buyerName,
			);
			const totalHarga = item.harga * item.qty;

			const created = await tx.poAlbum.create({
				data: {
					buyerId,
					batchNumber: input.batchNumber,
					itemName: input.itemName,
					orderType: input.orderType,
					memberName: item.memberName ?? null,
					qty: item.qty,
					totalQty: totalQtyBatch,
					harga: item.harga,
					totalHarga,
					dpAmount: item.dpAmount,
					dpMethod: item.dpMethod ?? null,
					dpPaid: item.dpPaid,
					fpAmount: item.fpAmount ?? null,
					fpMethod: item.fpMethod ?? null,
					fpPaid: item.fpPaid,
					coStatus: input.coStatus,
					trackingStatus: input.trackingStatus,
					notes: item.notes ?? null,
				},
				include: {
					buyer: {
						select: { id: true, name: true, email: true, idLine: true },
					},
				},
			});
			results.push(formatPoAlbumRow(created));
		}
		return results;
	});

	return {
		count: createdRows.length,
		items: createdRows,
	};
}

// ==========================================
// 4. Detail
// ==========================================

export async function getPoAlbumById(id: string) {
	const row = await prisma.poAlbum.findUnique({
		where: { id },
		include: {
			buyer: {
				select: {
					id: true,
					name: true,
					email: true,
					idLine: true,
					contact: true,
				},
			},
		},
	});

	if (!row) {
		throw AppError.notFound("Pesanan PO Album tidak ditemukan");
	}

	return formatPoAlbumRow(row);
}

// ==========================================
// 5. Update
// ==========================================

export async function updatePoAlbum(id: string, input: UpdatePoAlbumInput) {
	const existing = await prisma.poAlbum.findUnique({
		where: { id },
		select: { id: true, qty: true, harga: true },
	});

	if (!existing) {
		throw AppError.notFound("Pesanan PO Album tidak ditemukan");
	}

	const nextQty = input.qty ?? existing.qty;
	const nextHarga = input.harga ?? Number(existing.harga);
	const nextTotalHarga = nextQty * nextHarga;

	const updated = await prisma.poAlbum.update({
		where: { id },
		data: {
			...(input.batchNumber !== undefined && {
				batchNumber: input.batchNumber,
			}),
			...(input.itemName !== undefined && { itemName: input.itemName }),
			...(input.orderType !== undefined && { orderType: input.orderType }),
			...(input.memberName !== undefined && { memberName: input.memberName }),
			...(input.qty !== undefined && { qty: input.qty }),
			...(input.harga !== undefined && { harga: input.harga }),
			...((input.qty !== undefined || input.harga !== undefined) && {
				totalHarga: nextTotalHarga,
			}),
			...(input.dpAmount !== undefined && { dpAmount: input.dpAmount }),
			...(input.dpMethod !== undefined && { dpMethod: input.dpMethod }),
			...(input.dpPaid !== undefined && { dpPaid: input.dpPaid }),
			...(input.fpAmount !== undefined && { fpAmount: input.fpAmount }),
			...(input.fpMethod !== undefined && { fpMethod: input.fpMethod }),
			...(input.fpPaid !== undefined && { fpPaid: input.fpPaid }),
			...(input.coStatus !== undefined && { coStatus: input.coStatus }),
			...(input.trackingStatus !== undefined && {
				trackingStatus: input.trackingStatus,
			}),
			...(input.notes !== undefined && { notes: input.notes }),
		},
		include: {
			buyer: {
				select: {
					id: true,
					name: true,
					email: true,
					idLine: true,
					contact: true,
				},
			},
		},
	});

	return formatPoAlbumRow(updated);
}

// ==========================================
// 6. Delete
// ==========================================

export async function deletePoAlbum(id: string) {
	const existing = await prisma.poAlbum.findUnique({
		where: { id },
		select: { id: true },
	});

	if (!existing) {
		throw AppError.notFound("Pesanan PO Album tidak ditemukan");
	}

	await prisma.poAlbum.delete({ where: { id } });
	return { id, deleted: true };
}
