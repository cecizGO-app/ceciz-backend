import { CountryCode } from "@/generated/prisma/enums";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { GetBuyerBatchesQuery } from "./batches.schema.js";

export async function getBuyerBatches(query: GetBuyerBatchesQuery) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		status: "OPEN" as const,
		...(query.country_code && { countryCode: query.country_code }),
	};

	const [batches, total] = await Promise.all([
		prisma.batch.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				countryCode: true,
				batchNumber: true,
				batchDate: true,
				title: true,
				description: true,
				status: true,
				// We expose items aggregate for JP price detection
				items: {
					select: {
						hargaPerBuyer: true,
						hargaJualPerBuyer: true,
						pcs: true,
					},
					take: 1,
				},
			},
		}),
		prisma.batch.count({ where }),
	]);

	const data = batches.map((batch) => {
		const firstItem = batch.items[0];
		const isJp = batch.countryCode === CountryCode.JP;
		const priceStatus =
			isJp && !firstItem?.hargaJualPerBuyer ? "PENDING" : "AVAILABLE";

		return {
			id: batch.id,
			country_code: batch.countryCode,
			batch_number: batch.batchNumber,
			batch_date: batch.batchDate,
			title: batch.title,
			description: batch.description,
			status: batch.status,
			price_status: priceStatus,
			...(priceStatus === "PENDING" && {
				price_label: "Harga belum tersedia",
			}),
			can_order: batch.status === "OPEN",
		};
	});

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getBuyerBatchById(id: string) {
	const batch = await prisma.batch.findUnique({
		where: { id },
		select: {
			id: true,
			countryCode: true,
			batchNumber: true,
			batchDate: true,
			title: true,
			description: true,
			status: true,
			items: {
				select: {
					id: true,
					description: true,
					pcs: true,
					hargaPerBuyer: true,
					hargaJualPerBuyer: true,
					buyerName: true,
				},
			},
			tracking: {
				select: {
					trackingStatus: true,
					updatedAt: true,
				},
			},
		},
	});

	if (!batch) return null;

	const isJp = batch.countryCode === CountryCode.JP;
	const hasJpPrice = batch.items.some((i) => i.hargaJualPerBuyer !== null);
	const priceStatus = isJp && !hasJpPrice ? "PENDING" : "AVAILABLE";

	return {
		id: batch.id,
		country_code: batch.countryCode,
		batch_number: batch.batchNumber,
		batch_date: batch.batchDate,
		title: batch.title,
		description: batch.description,
		status: batch.status,
		can_order: batch.status === "OPEN",
		price_status: priceStatus,
		...(priceStatus === "PENDING" && { price_label: "Harga belum tersedia" }),
		item_detail: batch.items.map((item) => ({
			id: item.id,
			description: item.description,
			pcs: item.pcs,
			harga_per_buyer: item.hargaPerBuyer ? Number(item.hargaPerBuyer) : null,
			harga_jual_per_buyer: item.hargaJualPerBuyer
				? Number(item.hargaJualPerBuyer)
				: null,
			buyer_name: item.buyerName,
		})),
		tracking: batch.tracking
			? {
					status: batch.tracking.trackingStatus,
					updated_at: batch.tracking.updatedAt,
				}
			: null,
	};
}
