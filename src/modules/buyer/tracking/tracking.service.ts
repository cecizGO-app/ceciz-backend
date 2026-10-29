import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { GetTrackingQuery } from "./tracking.schema.js";

export async function getTrackings(buyerId: string, query: GetTrackingQuery) {
	const { skip, take } = getPaginationArgs(query);

	// Buyer can only see tracking for batches where they have an invoice
	const where = {
		batch: {
			invoices: {
				some: { buyerId },
			},
		},
	};

	const [trackings, total] = await Promise.all([
		prisma.tracking.findMany({
			where,
			skip,
			take,
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				batchId: true,
				countryCode: true,
				trackingStatus: true,
				resiNumber: true,
				whName: true,
				boxNo: true,
				description: true,
				notes: true,
				isArchived: true,
				createdAt: true,
				updatedAt: true,
				batch: {
					select: {
						id: true,
						title: true,
						batchNumber: true,
						countryCode: true,
						batchDate: true,
					},
				},
			},
		}),
		prisma.tracking.count({ where }),
	]);

	const data = trackings.map((t) => ({
		id: t.id,
		batch_id: t.batchId,
		country_code: t.countryCode,
		tracking_status: t.trackingStatus,
		resi_number: t.resiNumber,
		wh_name: t.whName,
		box_no: t.boxNo,
		description: t.description,
		notes: t.notes,
		is_archived: t.isArchived,
		batch: t.batch,
		created_at: t.createdAt,
		updated_at: t.updatedAt,
	}));

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getTrackingById(buyerId: string, trackingId: string) {
	const tracking = await prisma.tracking.findFirst({
		where: {
			id: trackingId,
			batch: {
				invoices: {
					some: { buyerId },
				},
			},
		},
		select: {
			id: true,
			batchId: true,
			countryCode: true,
			trackingStatus: true,
			resiNumber: true,
			whName: true,
			boxNo: true,
			description: true,
			notes: true,
			isArchived: true,
			createdAt: true,
			updatedAt: true,
			batch: {
				select: {
					id: true,
					title: true,
					batchNumber: true,
					countryCode: true,
					batchDate: true,
				},
			},
		},
	});

	if (!tracking) {
		throw new AppError(404, "TRACKING_NOT_FOUND", "Tracking tidak ditemukan");
	}

	return {
		id: tracking.id,
		batch_id: tracking.batchId,
		country_code: tracking.countryCode,
		tracking_status: tracking.trackingStatus,
		resi_number: tracking.resiNumber,
		wh_name: tracking.whName,
		box_no: tracking.boxNo,
		description: tracking.description,
		notes: tracking.notes,
		is_archived: tracking.isArchived,
		batch: tracking.batch,
		created_at: tracking.createdAt,
		updated_at: tracking.updatedAt,
	};
}
