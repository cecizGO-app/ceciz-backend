import type { Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import {
	BatchStatus,
	CountryCode,
	TrackingStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
	createBatchSchema,
	getBatchQuerySchema,
	updateBatchSchema,
} from "@/schemas/batch.schema";

// Create Batch Admin
export const createBatch = async (req: Request, res: Response) => {
	try {
		const validatedData = createBatchSchema.parse(req.body);
		const newBatch = await prisma.batch.create({
			data: {
				countryCode: validatedData.countryCode,
				batchNumber: validatedData.batchNumber,
				batchDate: new Date(validatedData.batchDate),
				title: validatedData.title,
				description: validatedData.description ?? null,
				shippingFee: validatedData.shippingFee ?? null,
				feeGo: validatedData.feeGo,
				feeRekap: validatedData.feeRekap,
				feeNyelem: validatedData.feeNyelem,
				rateHarian: validatedData.rateHarian ?? null,
				feeWh: validatedData.feeWh ?? null,
				feeProxy: validatedData.feeProxy ?? null,
				adminNyelemId: validatedData.adminNyelemId ?? null,
				proxyCoName: validatedData.proxyCoName ?? null,

				...(validatedData.items &&
					validatedData.items.length > 0 && {
						items: {
							create: validatedData.items.map((item) => ({
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

		return res.status(201).json({
			success: true,
			message: `Batch ${newBatch.batchNumber} (${newBatch.countryCode}) berhasil dibuat`,
			data: newBatch,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				success: false,
				message: "Validasi data gagal",
				errors: error.issues.map((err) => ({
					field: err.path.join("."),
					message: err.message,
				})),
			});
		}

		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2002") {
				return res.status(409).json({
					success: false,
					message: "Batch dengan nomor dan negara tersebut sudah ada",
				});
			}
		}

		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

//Update Batch Admin By ID
export const patchBatch = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "ID batch wajib disertakan dan harus valid",
			});
		}

		const validatedData = updateBatchSchema.parse(req.body);

		const updatedBatch = await prisma.batch.update({
			where: { id },
			data: {
				...(validatedData.countryCode && {
					countryCode: validatedData.countryCode,
				}),
				...(validatedData.batchNumber && {
					batchNumber: validatedData.batchNumber,
				}),
				...(validatedData.batchDate && { batchDate: validatedData.batchDate }),
				...(validatedData.title && { title: validatedData.title }),
				...(validatedData.description !== undefined && {
					description: validatedData.description,
				}),
				...(validatedData.shippingFee !== undefined && {
					shippingFee: validatedData.shippingFee,
				}),
				...(validatedData.feeGo !== undefined && {
					feeGo: validatedData.feeGo,
				}),
				...(validatedData.feeRekap !== undefined && {
					feeRekap: validatedData.feeRekap,
				}),
				...(validatedData.feeNyelem !== undefined && {
					feeNyelem: validatedData.feeNyelem,
				}),
				...(validatedData.rateHarian !== undefined && {
					rateHarian: validatedData.rateHarian,
				}),
				...(validatedData.feeWh !== undefined && {
					feeWh: validatedData.feeWh,
				}),
				...(validatedData.feeProxy !== undefined && {
					feeProxy: validatedData.feeProxy,
				}),
				...(validatedData.adminNyelemId !== undefined && {
					adminNyelemId: validatedData.adminNyelemId,
				}),
				...(validatedData.proxyCoName !== undefined && {
					proxyCoName: validatedData.proxyCoName,
				}),
				...(validatedData.status && { status: validatedData.status }),
				...(validatedData.hargaTotal !== undefined && {
					hargaTotal: validatedData.hargaTotal,
				}),
				...(validatedData.hargaTfSeller !== undefined && {
					hargaTfSeller: validatedData.hargaTfSeller,
				}),
				...(validatedData.selisihHarga !== undefined && {
					selisihHarga: validatedData.selisihHarga,
				}),
				...(validatedData.labaBersih !== undefined && {
					labaBersih: validatedData.labaBersih,
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
		return res.status(200).json({
			success: true,
			message: "Update Data Berhasil",
			data: updatedBatch,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				success: false,
				message: "Validasi data gagal",
				errors: error.issues.map((err) => ({
					field: err.path.join("."),
					message: err.message,
				})),
			});
		}

		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return res.status(404).json({
					success: false,
					message: "Batch dengan ID tersebut tidak ditemukan",
				});
			}

			if (error.code === "P2002") {
				return res.status(409).json({
					success: false,
					message: "Nomor batch untuk negara tersebut sudah terpakai",
				});
			}
		}
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Get Batch Stats Admin
export const getBatchStats = async (_req: Request, res: Response) => {
	try {
		const [
			activeBatches,
			totalPcProcessed,
			waitingCalculation,
			archivedBatches,
		] = await Promise.all([
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

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil statistik batch",
			data: {
				totalBatchAktif: activeBatches,
				totalPcDiproses: totalPcProcessed._sum.pcs || 0,
				menungguKalkulasiLaba: waitingCalculation,
				batchDiarsipkan: archivedBatches,
				activeBatches,
				activePcs: totalPcProcessed._sum.pcs || 0,
				waitingCalculation,
				archivedBatches,
			},
		});
	} catch (error) {
		console.error("Error getBatchStats:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

//Get Batch Admin
export const getBatch = async (req: Request, res: Response) => {
	try {
		const query = getBatchQuerySchema.parse(req.query);

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
			page && limit
				? prisma.batch.count({ where })
				: Promise.resolve(undefined),
		]);

		const mappedBatches = batches.map((batch) => {
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

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil daftar batch",
			data: mappedBatches,
			...(page && limit && total !== undefined
				? {
						pagination: {
							total,
							page,
							limit,
							totalPages: Math.ceil(total / limit),
						},
					}
				: {}),
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				success: false,
				message: "Query parameter tidak valid",
				errors: error.issues.map((err) => ({
					field: err.path.join("."),
					message: err.message,
				})),
			});
		}

		console.error("Error getBatch:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

//Get Batch Admin By ID
export const getBatchId = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "ID batch wajib disertakan dan harus valid",
			});
		}

		const batchId = await prisma.batch.findUnique({
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

		if (!batchId) {
			return res.status(404).json({
				success: false,
				message: "Batch tidak ditemukan",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil detail batch",
			data: batchId,
		});
	} catch {
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

//Delete Batch Admin
export const deleteBatchId = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "ID batch wajib disertakan dan harus valid",
			});
		}

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

		if (!existingBatch) {
			return res.status(404).json({
				success: false,
				message: "Data tidak ditemukan",
			});
		}

		if (existingBatch._count.items > 0 || existingBatch._count.orders > 0) {
			return res.status(400).json({
				success: false,
				message:
					"Batch tidak dapat dihapus karena sudah ada pesanan. Silahkan ubah status menjadi CLOSED atau ARCHIVED.",
			});
		}

		await prisma.batch.delete({
			where: { id },
		});

		return res.status(200).json({
			success: true,
			message: "Batch berhasil dihapus",
		});
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError) {
			if (error.code === "P2025") {
				return res.status(404).json({
					success: false,
					message: "Batch tidak ditemukan",
				});
			}
		}

		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};
