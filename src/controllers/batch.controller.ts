import type { Request, Response } from "express";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { createBatchSchema, updateBatchSchema } from "@/schemas/batch.schema";
import type { CountryCode, BatchStatus } from "@/generated/prisma/enums";

// Create Batch Admin
export const createBatch = async (req: Request, res: Response) => {
	try {
		const validatedData = createBatchSchema.parse(req.body);
		const newBatch = await prisma.batch.create({
			data: {
				countryCode: validatedData.countryCode,
				batchNumber: validatedData.batchNumber,
				batchDate: new Date(validatedData.batchDate),
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

		if (!id) {
			return res.status(400).json({
				success: false,
				message: "ID batch wajib disertakan",
			});
		}

		const validatedData = updateBatchSchema.parse(req.body);

		const updatedBatch = await prisma.batch.update({
			where: { id: id as string },
			data: {
				...(validatedData.countryCode && {
					countryCode: validatedData.countryCode,
				}),
				...(validatedData.batchNumber && {
					batchNumber: validatedData.batchNumber,
				}),
				...(validatedData.batchDate && { batchDate: validatedData.batchDate }),
				...(validatedData.description !== undefined && {
					description: validatedData.description,
				}),
				...(validatedData.shippingFee !== undefined && {
					shippingFee: validatedData.shippingFee,
				}),
				...(validatedData.feeGo && { feeGo: validatedData.feeGo }),
				...(validatedData.feeRekap && { feeRekap: validatedData.feeRekap }),
				...(validatedData.feeNyelem && { feeNyelem: validatedData.feeNyelem }),
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
			message: "Internal server error",
		});
	}
};

//Get Batch Admin
export const getBatch = async (req: Request, res: Response) => {
	try {
		const { countryCode, status } = req.query;

		const batches = await prisma.batch.findMany({
			where: {
				...(countryCode && { countryCode: countryCode as CountryCode }),
				...(status && { status: status as BatchStatus }),
			},
			orderBy: {
				createdAt: "desc",
			},
			include: {
				adminNyelem: {
					select: {
						id: true,
						name: true,
					},
				},
				_count: {
					select: {
						items: true,
					},
				},
			},
		});

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil daftar batch",
			data: batches,
		});
	} catch {
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
			message: "Berhasil menggambil detail batch",
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
