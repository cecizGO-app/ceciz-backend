import type { Prisma } from "../../../generated/prisma/client.js";
import {
	BatchStatus,
	CountryCode,
	TrackingStatus,
} from "../../../generated/prisma/enums.js";
import { AppError } from "../../../lib/errors.js";
import { prisma } from "../../../lib/prisma.js";
import type {
	CreateBatchInput,
	GetBatchQueryInput,
	UpdateBatchInput,
} from "./batches.schema.js";

export async function createBatch(input: CreateBatchInput) {
	const newBatch = await prisma.batch.create({
		data: {
			countryCode: input.countryCode,
			batchNumber: input.batchNumber,
			batchDate: new Date(input.batchDate),
			title: input.title,
			description: input.description ?? null,
			shippingFee: input.shippingFee ?? null,
			feeGo: input.feeGo,
			feeRekap: input.feeRekap,
			feeNyelem: input.feeNyelem,
			rateHarian: input.rateHarian ?? null,
			feeWh: input.feeWh ?? null,
			feeProxy: input.feeProxy ?? null,
			adminNyelemId: input.adminNyelemId ?? null,
			proxyCoName: input.proxyCoName ?? null,

			...(input.items &&
				input.items.length > 0 && {
					items: {
						create: input.items.map((item) => ({
							buyerId: item.buyerId,
							buyerName: item.buyerName ?? null,
							description: item.description,
							hargaAsli: item.hargaAsli,
							pcs: item.pcs,
							feeNyelem: item.feeNyelem ?? null,
							hargaPerBuyer: item.hargaPerBuyer ?? null,
							hargaJualPerBuyer: item.hargaJualPerBuyer ?? null,
						})),
					},
				}),
		},
		include: {
			items: true,
		},
	});

	return newBatch;
}

export async function updateBatch(id: string, input: UpdateBatchInput) {
	const updatedBatch = await prisma.batch.update({
		where: { id },
		data: {
			...(input.countryCode && {
				countryCode: input.countryCode,
			}),
			...(input.batchNumber && {
				batchNumber: input.batchNumber,
			}),
			...(input.batchDate && { batchDate: input.batchDate }),
			...(input.title && { title: input.title }),
			...(input.description !== undefined && {
				description: input.description,
			}),
			...(input.shippingFee !== undefined && {
				shippingFee: input.shippingFee,
			}),
			...(input.feeGo !== undefined && {
				feeGo: input.feeGo,
			}),
			...(input.feeRekap !== undefined && {
				feeRekap: input.feeRekap,
			}),
			...(input.feeNyelem !== undefined && {
				feeNyelem: input.feeNyelem,
			}),
			...(input.rateHarian !== undefined && {
				rateHarian: input.rateHarian,
			}),
			...(input.feeWh !== undefined && {
				feeWh: input.feeWh,
			}),
			...(input.feeProxy !== undefined && {
				feeProxy: input.feeProxy,
			}),
			...(input.adminNyelemId !== undefined && {
				adminNyelemId: input.adminNyelemId,
			}),
			...(input.proxyCoName !== undefined && {
				proxyCoName: input.proxyCoName,
			}),
			...(input.status && { status: input.status }),
			...(input.hargaTotal !== undefined && {
				hargaTotal: input.hargaTotal,
			}),
			...(input.hargaTfSeller !== undefined && {
				hargaTfSeller: input.hargaTfSeller,
			}),
			...(input.selisihHarga !== undefined && {
				selisihHarga: input.selisihHarga,
			}),
			...(input.labaBersih !== undefined && {
				labaBersih: input.labaBersih,
			}),
		},
		include: {
			adminNyelem: {
				select: {
					id: true,
					name: true,
				},
			},
			tracking: true,
		},
	});

	return updatedBatch;
}

export async function getBatchStats() {
	const [activeBatches, totalPcProcessed, waitingCalculation, archivedBatches] =
		await Promise.all([
			prisma.batch.count({
				where: { status: BatchStatus.OPEN },
			}),
			prisma.batchItem.aggregate({
				_sum: { pcs: true },
				where: { batch: { status: BatchStatus.OPEN } },
			}),
			prisma.batch.count({
				where: {
					tracking: {
						trackingStatus: {
							in: [
								TrackingStatus.ARRIVED_WH_INA,
								TrackingStatus.BISA_DI_CO,
								TrackingStatus.DONE,
							],
						},
					},
					labaBersih: null,
				},
			}),
			prisma.batch.count({
				where: { status: BatchStatus.ARCHIVED },
			}),
		]);

	return {
		totalBatchAktif: activeBatches,
		totalPcDiproses: totalPcProcessed._sum.pcs || 0,
		menungguKalkulasiLaba: waitingCalculation,
		batchDiarsipkan: archivedBatches,
		activeBatches,
		activePcs: totalPcProcessed._sum.pcs || 0,
		waitingCalculation,
		archivedBatches,
	};
}

export async function getBatches(query: GetBatchQueryInput) {
	const andConditions: Prisma.BatchWhereInput[] = [];

	if (query.countryCode) {
		andConditions.push({ countryCode: query.countryCode });
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	} else if (query.includeArchived === false) {
		andConditions.push({ status: { not: BatchStatus.ARCHIVED } });
	}

	if (query.whName) {
		andConditions.push({
			tracking: {
				whName: { contains: query.whName, mode: "insensitive" },
			},
		});
	}

	if (query.search) {
		const searchTrimmed = query.search.trim();
		const orConditions: Prisma.BatchWhereInput[] = [
			{ title: { contains: searchTrimmed, mode: "insensitive" } },
			{ proxyCoName: { contains: searchTrimmed, mode: "insensitive" } },
			{
				tracking: {
					whName: { contains: searchTrimmed, mode: "insensitive" },
				},
			},
		];

		const searchNum = parseInt(searchTrimmed, 10);
		if (!Number.isNaN(searchNum) && /^\d+$/.test(searchTrimmed)) {
			orConditions.push({ batchNumber: searchNum });
		}

		const match = searchTrimmed.match(/^([a-zA-Z]{2,3})[- ]?(\d+)$/);
		if (match?.[1] && match[2]) {
			const country = match[1].toUpperCase() as CountryCode;
			const num = parseInt(match[2], 10);
			if (Object.values(CountryCode).includes(country)) {
				orConditions.push({
					AND: [{ countryCode: country }, { batchNumber: num }],
				});
			}
		}

		andConditions.push({ OR: orConditions });
	}

	const where: Prisma.BatchWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const page = query.page;
	const limit = query.limit;
	const skip = page && limit ? (page - 1) * limit : undefined;
	const take = limit ?? undefined;

	const [batches, total] = await Promise.all([
		prisma.batch.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			...(skip !== undefined && { skip }),
			...(take !== undefined && { take }),
			include: {
				adminNyelem: {
					select: {
						id: true,
						name: true,
					},
				},
				tracking: {
					select: {
						id: true,
						whName: true,
						boxNo: true,
						trackingStatus: true,
					},
				},
				items: {
					select: {
						id: true,
						pcs: true,
						buyerId: true,
						buyerName: true,
					},
				},
				_count: {
					select: {
						items: true,
						orders: true,
					},
				},
			},
		}),
		page && limit ? prisma.batch.count({ where }) : Promise.resolve(undefined),
	]);

	const data = batches.map((batch) => {
		const totalPcs = batch.items.reduce(
			(sum, item) => sum + (item.pcs || 1),
			0,
		);
		const uniqueBuyers = new Set(
			batch.items.map((i) => i.buyerId).filter(Boolean),
		).size;
		return {
			...batch,
			totalPcs,
			totalBuyers: uniqueBuyers,
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

export async function getBatchById(id: string) {
	const batch = await prisma.batch.findUnique({
		where: { id },
		include: {
			adminNyelem: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			items: true,
			tracking: true,
		},
	});

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	return batch;
}

export async function deleteBatch(id: string) {
	const existingBatch = await prisma.batch.findUnique({
		where: { id },
		include: {
			_count: {
				select: {
					items: true,
					orders: true,
				},
			},
		},
	});

	if (!existingBatch) throw AppError.notFound("Batch tidak ditemukan");

	if (existingBatch._count.items > 0 || existingBatch._count.orders > 0) {
		throw AppError.badRequest(
			"Batch tidak dapat dihapus karena sudah ada pesanan. Silahkan ubah status menjadi CLOSED atau ARCHIVED.",
		);
	}

	await prisma.batch.delete({
		where: { id },
	});
}
