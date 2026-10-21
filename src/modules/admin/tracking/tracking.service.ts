import { AppError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import type {
	GetTrackingQueryInput,
	UpdateTrackingInput,
} from "./tracking.schema.js";

export async function getAllTracking(query: GetTrackingQueryInput) {
	const trackings = await prisma.tracking.findMany({
		where: {
			...(query.countryCode && { countryCode: query.countryCode }),
			...(query.trackingStatus && { trackingStatus: query.trackingStatus }),
			...(query.whName && {
				whName: { contains: query.whName, mode: "insensitive" },
			}),
			...(query.search && {
				OR: [
					{ whName: { contains: query.search, mode: "insensitive" } },
					{ boxNo: { contains: query.search, mode: "insensitive" } },
					{ description: { contains: query.search, mode: "insensitive" } },
					{ notes: { contains: query.search, mode: "insensitive" } },
					{ resiNumber: { has: query.search } },
					{
						batch: {
							items: {
								some: {
									OR: [
										{
											description: {
												contains: query.search,
												mode: "insensitive",
											},
										},
										{
											buyerName: {
												contains: query.search,
												mode: "insensitive",
											},
										},
										{
											buyer: {
												name: { contains: query.search, mode: "insensitive" },
											},
										},
									],
								},
							},
						},
					},
				],
			}),
		},
		orderBy: {
			updatedAt: "desc",
		},
		include: {
			batch: {
				select: {
					id: true,
					batchNumber: true,
					countryCode: true,
					status: true,
					items: {
						select: {
							id: true,
							description: true,
							pcs: true,
							buyer: {
								select: {
									id: true,
									name: true,
									idLine: true,
								},
							},
						},
					},
				},
			},
		},
	});

	return trackings;
}

export async function getTrackingByBatchId(batchId: string) {
	const batch = await prisma.batch.findUnique({
		where: { id: batchId },
	});

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	const tracking = await prisma.tracking.upsert({
		where: { batchId },
		update: {},
		create: {
			batchId,
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
								},
							},
						},
					},
				},
			},
		},
	});

	return tracking;
}

export async function updateTracking(
	batchId: string,
	input: UpdateTrackingInput,
) {
	const batch = await prisma.batch.findUnique({
		where: { id: batchId },
	});

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	const updatedTracking = await prisma.tracking.upsert({
		where: { batchId },
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
		},
		create: {
			batchId,
			countryCode: batch.countryCode,
			trackingStatus: input.trackingStatus ?? "PO",
			resiNumber: input.resiNumber ?? [],
			whName: input.whName ?? null,
			boxNo: input.boxNo ?? null,
			description: input.description ?? null,
			checkedOut: input.checkedOut ?? false,
			uploadedToAlbum: input.uploadedToAlbum ?? false,
			notes: input.notes ?? null,
		},
	});

	return updatedTracking;
}
