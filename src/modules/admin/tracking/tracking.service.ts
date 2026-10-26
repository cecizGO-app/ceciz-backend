import type { Prisma } from "@/generated/prisma/client";
import {
	CountryCode,
	NotificationChannel,
	NotificationType,
	TrackingStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
	GetTrackingQueryInput,
	UpdateTrackingInput,
} from "./tracking.schema.js";

const TRACKING_STATUS_LABELS: Record<TrackingStatus, string> = {
	PO: "PO",
	ON_SELLER_HAND: "On Seller Hand",
	ARRIVED_WH_LUAR: "Arrived WH Luar",
	OTW_INA: "OTW INA",
	ARRIVED_WH_INA: "Arrived WH INA",
	BISA_DI_CO: "Bisa di CO",
	DONE: "Done",
};

export async function getTrackingStats() {
	const [activeCount, arrivedWhInaCount, bisaDiCoCount, doneCount, totalAll] =
		await Promise.all([
			prisma.tracking.count({
				where: {
					isArchived: false,
					trackingStatus: { not: TrackingStatus.DONE },
				},
			}),
			prisma.tracking.count({
				where: {
					trackingStatus: TrackingStatus.ARRIVED_WH_INA,
				},
			}),
			prisma.tracking.count({
				where: {
					trackingStatus: TrackingStatus.BISA_DI_CO,
				},
			}),
			prisma.tracking.count({
				where: {
					OR: [{ trackingStatus: TrackingStatus.DONE }, { isArchived: true }],
				},
			}),
			prisma.tracking.count(),
		]);

	return {
		totalPaketBerjalan: activeCount,
		tibaDiWarehouseId: arrivedWhInaCount,
		siapDiCoShopee: bisaDiCoCount,
		paketSelesai: doneCount,
		activePackages: activeCount,
		arrivedWhIna: arrivedWhInaCount,
		readyToCheckout: bisaDiCoCount,
		archivedPackages: doneCount,
		tabCounts: {
			active: activeCount,
			archived: doneCount,
			done: doneCount,
			all: totalAll,
		},
	};
}

export async function getAllTracking(query: GetTrackingQueryInput) {
	const andConditions: Prisma.TrackingWhereInput[] = [];

	if (query.countryCode) {
		andConditions.push({ countryCode: query.countryCode });
	}

	if (query.trackingStatus) {
		andConditions.push({ trackingStatus: query.trackingStatus });
	}

	if (query.tab === "active" || query.isArchived === false) {
		andConditions.push({
			isArchived: false,
			trackingStatus: { not: TrackingStatus.DONE },
		});
	} else if (
		query.tab === "archived" ||
		query.tab === "done" ||
		query.isArchived === true
	) {
		andConditions.push({
			OR: [{ isArchived: true }, { trackingStatus: TrackingStatus.DONE }],
		});
	}

	if (query.whName) {
		andConditions.push({
			whName: { contains: query.whName, mode: "insensitive" },
		});
	}

	if (query.search) {
		const searchTrimmed = query.search.trim();
		const orConditions: Prisma.TrackingWhereInput[] = [
			{ whName: { contains: searchTrimmed, mode: "insensitive" } },
			{ boxNo: { contains: searchTrimmed, mode: "insensitive" } },
			{ description: { contains: searchTrimmed, mode: "insensitive" } },
			{ notes: { contains: searchTrimmed, mode: "insensitive" } },
			{ resiNumber: { has: searchTrimmed } },
			{
				batch: {
					title: { contains: searchTrimmed, mode: "insensitive" },
				},
			},
			{
				batch: {
					proxyCoName: { contains: searchTrimmed, mode: "insensitive" },
				},
			},
			{
				batch: {
					items: {
						some: {
							OR: [
								{
									description: {
										contains: searchTrimmed,
										mode: "insensitive",
									},
								},
								{
									buyerName: {
										contains: searchTrimmed,
										mode: "insensitive",
									},
								},
								{
									buyer: {
										name: { contains: searchTrimmed, mode: "insensitive" },
									},
								},
								{
									buyer: {
										idLine: { contains: searchTrimmed, mode: "insensitive" },
									},
								},
							],
						},
					},
				},
			},
		];

		const searchNum = parseInt(searchTrimmed, 10);
		if (!Number.isNaN(searchNum) && /^\d+$/.test(searchTrimmed)) {
			orConditions.push({ batch: { batchNumber: searchNum } });
		}

		const batchMatch = searchTrimmed.match(/^([a-zA-Z]{2,3})[- ]?(\d+)$/);
		if (batchMatch?.[1] && batchMatch[2]) {
			const country = batchMatch[1].toUpperCase() as CountryCode;
			const num = parseInt(batchMatch[2], 10);
			if (Object.values(CountryCode).includes(country)) {
				orConditions.push({
					batch: {
						countryCode: country,
						batchNumber: num,
					},
				});
			}
		}

		andConditions.push({ OR: orConditions });
	}

	const where: Prisma.TrackingWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const page = query.page;
	const limit = query.limit;
	const skip = page && limit ? (page - 1) * limit : undefined;
	const take = limit ?? undefined;

	const [trackings, total] = await Promise.all([
		prisma.tracking.findMany({
			where,
			orderBy: {
				updatedAt: "desc",
			},
			...(skip !== undefined && { skip }),
			...(take !== undefined && { take }),
			include: {
				batch: {
					select: {
						id: true,
						title: true,
						batchNumber: true,
						countryCode: true,
						status: true,
						proxyCoName: true,
						items: {
							select: {
								id: true,
								description: true,
								pcs: true,
								buyerId: true,
								buyerName: true,
								buyer: {
									select: {
										id: true,
										name: true,
										idLine: true,
										contact: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		page && limit
			? prisma.tracking.count({ where })
			: Promise.resolve(undefined),
	]);

	const data = trackings.map((tracking) => {
		const batchCode = `${tracking.batch.countryCode}-${String(tracking.batch.batchNumber).padStart(3, "0")}`;
		const totalPcs = tracking.batch.items.reduce(
			(sum, item) => sum + (item.pcs || 1),
			0,
		);
		const totalBuyers = new Set(
			tracking.batch.items.map((i) => i.buyerId).filter(Boolean),
		).size;

		return {
			...tracking,
			batchCode,
			totalPcs,
			totalBuyers,
		};
	});

	const pagination =
		page && limit && total !== undefined
			? {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				}
			: undefined;

	return { data, pagination };
}

export async function getTrackingByBatchId(idOrBatchId: string) {
	let batch = await prisma.batch.findUnique({
		where: { id: idOrBatchId },
	});

	if (!batch) {
		const existingTracking = await prisma.tracking.findUnique({
			where: { id: idOrBatchId },
			include: { batch: true },
		});
		if (existingTracking) {
			batch = existingTracking.batch;
		}
	}

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	const tracking = await prisma.tracking.upsert({
		where: { batchId: batch.id },
		update: {},
		create: {
			batchId: batch.id,
			countryCode: batch.countryCode,
			trackingStatus: "PO",
			resiNumber: [],
		},
		include: {
			batch: {
				include: {
					items: {
						include: {
							buyer: {
								select: {
									id: true,
									name: true,
									idLine: true,
									contact: true,
								},
							},
						},
					},
				},
			},
		},
	});

	return {
		...tracking,
		batchCode: `${batch.countryCode}-${String(batch.batchNumber).padStart(3, "0")}`,
	};
}

export async function updateTracking(
	idOrBatchId: string,
	input: UpdateTrackingInput,
) {
	let batch = await prisma.batch.findUnique({
		where: { id: idOrBatchId },
		include: {
			items: {
				select: { buyerId: true },
			},
		},
	});

	if (!batch) {
		const existingTracking = await prisma.tracking.findUnique({
			where: { id: idOrBatchId },
			select: { batchId: true },
		});
		if (existingTracking) {
			batch = await prisma.batch.findUnique({
				where: { id: existingTracking.batchId },
				include: {
					items: {
						select: { buyerId: true },
					},
				},
			});
		}
	}

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	const autoArchive =
		input.isArchived !== undefined
			? input.isArchived
			: input.trackingStatus === TrackingStatus.DONE
				? true
				: input.trackingStatus !== undefined
					? false
					: undefined;

	const updatedTracking = await prisma.$transaction(async (tx) => {
		const record = await tx.tracking.upsert({
			where: { batchId: batch.id },
			update: {
				...(input.trackingStatus && {
					trackingStatus: input.trackingStatus,
				}),
				...(input.resiNumber && {
					resiNumber: input.resiNumber,
				}),
				...(input.whName !== undefined && {
					whName: input.whName,
				}),
				...(input.boxNo !== undefined && {
					boxNo: input.boxNo,
				}),
				...(input.description !== undefined && {
					description: input.description,
				}),
				...(input.checkedOut !== undefined && {
					checkedOut: input.checkedOut,
				}),
				...(input.uploadedToAlbum !== undefined && {
					uploadedToAlbum: input.uploadedToAlbum,
				}),
				...(input.notes !== undefined && {
					notes: input.notes,
				}),
				...(autoArchive !== undefined && {
					isArchived: autoArchive,
					archivedAt: autoArchive ? new Date() : null,
				}),
			},
			create: {
				batchId: batch.id,
				countryCode: batch.countryCode,
				trackingStatus: input.trackingStatus ?? "PO",
				resiNumber: input.resiNumber ?? [],
				whName: input.whName ?? null,
				boxNo: input.boxNo ?? null,
				description: input.description ?? null,
				checkedOut: input.checkedOut ?? false,
				uploadedToAlbum: input.uploadedToAlbum ?? false,
				notes: input.notes ?? null,
				isArchived: autoArchive ?? false,
				archivedAt: autoArchive ? new Date() : null,
			},
		});

		if (input.trackingStatus) {
			const uniqueBuyerIds = Array.from(
				new Set(batch.items.map((i) => i.buyerId).filter(Boolean)),
			);
			const batchCode = `${batch.countryCode}-${String(batch.batchNumber).padStart(3, "0")}`;
			const statusLabel = TRACKING_STATUS_LABELS[input.trackingStatus];

			for (const buyerId of uniqueBuyerIds) {
				await tx.notification.create({
					data: {
						buyerId,
						channel: NotificationChannel.IN_APP,
						type: NotificationType.TRACKING_UPDATE,
						title: "Update Status Pengiriman",
						body: `Status pengiriman batch ${batchCode} (${batch.title}) diperbarui menjadi: ${statusLabel}.`,
						triggeredByEvent: "TRACKING_UPDATED",
						referenceId: record.id,
					},
				});
			}
		}

		return record;
	});

	return updatedTracking;
}
