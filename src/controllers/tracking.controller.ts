import type { Request, Response } from "express";
import { ZodError } from "zod";
import { prisma } from "../lib/prisma.js";
import {
	getTrackingQuerySchema,
	updateTrackingSchema,
} from "../schemas/tracking.schema.js";

// Get Tracking
export const getAllTracking = async (req: Request, res: Response) => {
	try {
		const query = getTrackingQuerySchema.parse(req.query);

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

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil data tracking logistik",
			data: trackings,
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

		console.error("Error getAllTracking:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// GET Tracking ID
export const getTrackingByBatchId = async (req: Request, res: Response) => {
	try {
		const { batchId } = req.params;

		if (!batchId || typeof batchId !== "string") {
			return res.status(400).json({
				success: false,
				message: "Batch ID wajib disertakan dan harus valid",
			});
		}

		const batch = await prisma.batch.findUnique({
			where: { id: batchId },
		});

		if (!batch) {
			return res.status(404).json({
				success: false,
				message: "Batch tidak ditemukan",
			});
		}

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

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil detail tracking batch",
			data: tracking,
		});
	} catch (error) {
		console.error("Error getTrackingByBatchId:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// PATCH Tracking
export const updateTracking = async (req: Request, res: Response) => {
	try {
		const { batchId } = req.params;

		if (!batchId || typeof batchId !== "string") {
			return res.status(400).json({
				success: false,
				message: "Batch ID wajib disertakan dan harus valid",
			});
		}

		const batch = await prisma.batch.findUnique({
			where: { id: batchId },
		});

		if (!batch) {
			return res.status(404).json({
				success: false,
				message: "Batch tidak ditemukan",
			});
		}

		const validatedData = updateTrackingSchema.parse(req.body);

		const updatedTracking = await prisma.tracking.upsert({
			where: { batchId },
			update: {
				...(validatedData.trackingStatus && {
					trackingStatus: validatedData.trackingStatus,
				}),
				...(validatedData.resiNumber && {
					resiNumber: validatedData.resiNumber,
				}),
				...(validatedData.whName !== undefined && {
					whName: validatedData.whName,
				}),
				...(validatedData.boxNo !== undefined && {
					boxNo: validatedData.boxNo,
				}),
				...(validatedData.description !== undefined && {
					description: validatedData.description,
				}),
				...(validatedData.checkedOut !== undefined && {
					checkedOut: validatedData.checkedOut,
				}),
				...(validatedData.uploadedToAlbum !== undefined && {
					uploadedToAlbum: validatedData.uploadedToAlbum,
				}),
				...(validatedData.notes !== undefined && {
					notes: validatedData.notes,
				}),
			},
			create: {
				batchId,
				countryCode: batch.countryCode,
				trackingStatus: validatedData.trackingStatus ?? "PO",
				resiNumber: validatedData.resiNumber ?? [],
				whName: validatedData.whName ?? null,
				boxNo: validatedData.boxNo ?? null,
				description: validatedData.description ?? null,
				checkedOut: validatedData.checkedOut ?? false,
				uploadedToAlbum: validatedData.uploadedToAlbum ?? false,
				notes: validatedData.notes ?? null,
			},
		});

		return res.status(200).json({
			success: true,
			message: "Data tracking berhasil diperbarui",
			data: updatedTracking,
		});
	} catch (error) {
		if (error instanceof ZodError) {
			return res.status(400).json({
				success: false,
				message: "Validasi data tracking gagal",
				errors: error.issues.map((err) => ({
					field: err.path.join("."),
					message: err.message,
				})),
			});
		}

		console.error("Error updateTracking:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};
