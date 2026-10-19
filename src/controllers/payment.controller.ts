import type { Request, Response } from "express";
import { ZodError } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
	CountryCode,
	InvoiceStatus,
	NotificationChannel,
	NotificationType,
	VerificationStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import {
	bulkVerifyPaymentSchema,
	createPaymentSchema,
	getPaymentQuerySchema,
	verifyPaymentSchema,
} from "@/schemas/payment.schema";

// Get Payment Stats Admin (Top Cards)
export const getPaymentStats = async (_req: Request, res: Response) => {
	try {
		const now = new Date();
		const startOfDay = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		);
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const monthNames = [
			"Januari",
			"Februari",
			"Maret",
			"April",
			"Mei",
			"Juni",
			"Juli",
			"Agustus",
			"September",
			"Oktober",
			"November",
			"Desember",
		];
		const currentMonthLabel = `Bulan ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

		const [
			totalPending,
			pendingToday,
			approvedTodayCount,
			approvedTodaySum,
			rejectedTodayCount,
			monthApprovedSum,
			totalApprovedAll,
			totalRejectedAll,
			totalAll,
		] = await Promise.all([
			// 1. Menunggu Verifikasi
			prisma.payment.count({
				where: { verificationStatus: VerificationStatus.PENDING },
			}),
			// Menunggu verifikasi yang diunggah hari ini
			prisma.payment.count({
				where: {
					verificationStatus: VerificationStatus.PENDING,
					createdAt: { gte: startOfDay },
				},
			}),
			// 2. Disetujui Hari Ini (Count)
			prisma.payment.count({
				where: {
					verificationStatus: VerificationStatus.APPROVED,
					verifiedAt: { gte: startOfDay },
				},
			}),
			// Disetujui Hari Ini (Nominal)
			prisma.payment.aggregate({
				_sum: { amount: true },
				where: {
					verificationStatus: VerificationStatus.APPROVED,
					verifiedAt: { gte: startOfDay },
				},
			}),
			// 3. Ditolak Hari Ini (Count)
			prisma.payment.count({
				where: {
					verificationStatus: VerificationStatus.REJECTED,
					verifiedAt: { gte: startOfDay },
				},
			}),
			// 4. Total Terverifikasi Bulan Ini (Nominal)
			prisma.payment.aggregate({
				_sum: { amount: true },
				where: {
					verificationStatus: VerificationStatus.APPROVED,
					verifiedAt: { gte: startOfMonth },
				},
			}),
			// Tab Counts:
			prisma.payment.count({
				where: { verificationStatus: VerificationStatus.APPROVED },
			}),
			prisma.payment.count({
				where: { verificationStatus: VerificationStatus.REJECTED },
			}),
			prisma.payment.count(),
		]);

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil statistik pembayaran",
			data: {
				menungguVerifikasi: {
					count: totalPending,
					diunggahHariIni: pendingToday,
				},
				disetujuiHariIni: {
					count: approvedTodayCount,
					totalNominal: Number(approvedTodaySum._sum.amount ?? 0),
				},
				ditolakHariIni: {
					count: rejectedTodayCount,
				},
				totalTerverifikasiBulanIni: {
					totalNominal: Number(monthApprovedSum._sum.amount ?? 0),
					labelBulan: currentMonthLabel,
				},
				// Tab counter helpers
				tabCounts: {
					pending: totalPending,
					approved: totalApprovedAll,
					rejected: totalRejectedAll,
					all: totalAll,
				},
			},
		});
	} catch (error) {
		console.error("Error getPaymentStats:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Get Payments List
export const getPayments = async (req: Request, res: Response) => {
	try {
		const query = getPaymentQuerySchema.parse(req.query);

		const andConditions: Prisma.PaymentWhereInput[] = [];

		if (query.status) {
			andConditions.push({ verificationStatus: query.status });
		}

		if (query.paymentMethod) {
			andConditions.push({ paymentMethod: query.paymentMethod });
		}

		if (query.batchId) {
			andConditions.push({ invoice: { batchId: query.batchId } });
		}

		// Time range filter
		if (query.timeRange) {
			const now = new Date();
			if (query.timeRange === "today") {
				const startOfDay = new Date(
					now.getFullYear(),
					now.getMonth(),
					now.getDate(),
				);
				andConditions.push({ createdAt: { gte: startOfDay } });
			} else if (query.timeRange === "this_week") {
				const dayOfWeek = now.getDay();
				const startOfWeek = new Date(now);
				startOfWeek.setDate(now.getDate() - dayOfWeek);
				startOfWeek.setHours(0, 0, 0, 0);
				andConditions.push({ createdAt: { gte: startOfWeek } });
			} else if (query.timeRange === "this_month") {
				const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
				andConditions.push({ createdAt: { gte: startOfMonth } });
			}
		} else if (query.startDate || query.endDate) {
			const dateFilter: Prisma.DateTimeFilter = {};
			if (query.startDate) dateFilter.gte = query.startDate;
			if (query.endDate) dateFilter.lte = query.endDate;
			andConditions.push({ createdAt: dateFilter });
		}

		// Search filter: buyer name, username/contact, batch number/title, nominal
		if (query.search) {
			const searchTrimmed = query.search.trim();
			const orConditions: Prisma.PaymentWhereInput[] = [
				{ buyer: { name: { contains: searchTrimmed, mode: "insensitive" } } },
				{
					buyer: { contact: { contains: searchTrimmed, mode: "insensitive" } },
				},
				{
					buyer: { idLine: { contains: searchTrimmed, mode: "insensitive" } },
				},
				{
					invoice: {
						batch: {
							title: { contains: searchTrimmed, mode: "insensitive" },
						},
					},
				},
			];

			const searchNum = parseFloat(searchTrimmed.replace(/[^0-9.]/g, ""));
			if (!Number.isNaN(searchNum) && searchNum > 0) {
				orConditions.push({ amount: searchNum });
			}

			// Format batch number (e.g. CH-025 or 25)
			const batchMatch = searchTrimmed.match(/^([a-zA-Z]{2,3})[- ]?(\d+)$/);
			if (batchMatch?.[1] && batchMatch[2]) {
				const country = batchMatch[1].toUpperCase() as CountryCode;
				const num = parseInt(batchMatch[2], 10);
				if (Object.values(CountryCode).includes(country)) {
					orConditions.push({
						invoice: {
							batch: {
								countryCode: country,
								batchNumber: num,
							},
						},
					});
				}
			}

			andConditions.push({ OR: orConditions });
		}

		const where: Prisma.PaymentWhereInput =
			andConditions.length > 0 ? { AND: andConditions } : {};

		const page = query.page;
		const limit = query.limit;
		const skip = page && limit ? (page - 1) * limit : undefined;
		const take = limit ?? undefined;

		const [payments, total] = await Promise.all([
			prisma.payment.findMany({
				where,
				orderBy: { createdAt: "desc" },
				...(skip !== undefined && { skip }),
				...(take !== undefined && { take }),
				include: {
					buyer: {
						select: {
							id: true,
							name: true,
							email: true,
							contact: true,
							idLine: true,
							image: true,
						},
					},
					invoice: {
						select: {
							id: true,
							totalAmount: true,
							invoiceStatus: true,
							itemDetail: true,
							batchId: true,
							batch: {
								select: {
									id: true,
									countryCode: true,
									batchNumber: true,
									title: true,
								},
							},
						},
					},
					verifiedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			}),
			page && limit
				? prisma.payment.count({ where })
				: Promise.resolve(undefined),
		]);

		const mappedPayments = payments.map((p) => {
			const batchCode = p.invoice?.batch
				? `${p.invoice.batch.countryCode}-${String(p.invoice.batch.batchNumber).padStart(3, "0")}`
				: "-";

			let keterangan = "-";
			if (Array.isArray(p.invoice?.itemDetail)) {
				keterangan = (
					p.invoice.itemDetail as Array<{
						item_name?: string;
						description?: string;
						qty?: number;
					}>
				)
					.map(
						(item) =>
							`${item.item_name || item.description || "Item"} (${item.qty || 1} pcs)`,
					)
					.join(", ");
			}

			return {
				id: p.id,
				invoiceId: p.invoiceId,
				buyerId: p.buyerId,
				buyer: {
					id: p.buyer.id,
					name: p.buyer.name,
					email: p.buyer.email,
					contact: p.buyer.contact ?? p.buyer.idLine ?? "-",
					handle: p.buyer.contact
						? `@${p.buyer.contact.replace(/^@/, "")}`
						: p.buyer.name,
					image: p.buyer.image,
				},
				batch: {
					id: p.invoice?.batch?.id,
					code: batchCode,
					title: p.invoice?.batch?.title,
					countryCode: p.invoice?.batch?.countryCode,
					batchNumber: p.invoice?.batch?.batchNumber,
				},
				amount: Number(p.amount),
				paymentMethod: p.paymentMethod,
				sumber: p.verifiedById && !p.paymentProofUrl ? "Admin" : "Buyer",
				keterangan,
				paymentDate: p.paymentDate,
				uploadTime: p.createdAt,
				paymentProofUrl: p.paymentProofUrl,
				verificationStatus: p.verificationStatus,
				verifiedBy: p.verifiedBy,
				verifiedAt: p.verifiedAt,
				rejectReason: p.rejectReason,
			};
		});

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil daftar pembayaran",
			data: mappedPayments,
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

		console.error("Error getPayments:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Get Payment Detail by ID
export const getPaymentById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "ID pembayaran wajib disertakan dan harus valid",
			});
		}

		const payment = await prisma.payment.findUnique({
			where: { id: id as string },
			include: {
				buyer: {
					select: {
						id: true,
						name: true,
						email: true,
						contact: true,
						idLine: true,
						image: true,
					},
				},
				invoice: {
					include: {
						batch: true,
					},
				},
				verifiedBy: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		if (!payment) {
			return res.status(404).json({
				success: false,
				message: "Pembayaran tidak ditemukan",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Berhasil mengambil detail pembayaran",
			data: payment,
		});
	} catch (error) {
		console.error("Error getPaymentById:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Verify Payment (Approve or Reject)
export const verifyPayment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id || typeof id !== "string") {
			return res.status(400).json({
				success: false,
				message: "ID pembayaran wajib disertakan dan harus valid",
			});
		}

		const validatedData = verifyPaymentSchema.parse(req.body);
		const adminUser = req.user;

		const existingPayment = await prisma.payment.findUnique({
			where: { id: id as string },
			include: { invoice: true },
		});

		if (!existingPayment) {
			return res.status(404).json({
				success: false,
				message: "Pembayaran tidak ditemukan",
			});
		}

		const result = await prisma.$transaction(async (tx) => {
			const updatedPayment = await tx.payment.update({
				where: { id: id as string },
				data: {
					verificationStatus: validatedData.status,
					verifiedById: adminUser?.id ?? null,
					verifiedAt: new Date(),
					rejectReason:
						validatedData.status === "REJECTED"
							? (validatedData.rejectReason ?? null)
							: null,
				},
				include: {
					buyer: { select: { id: true, name: true, email: true } },
					invoice: { include: { batch: true } },
					verifiedBy: { select: { id: true, name: true } },
				},
			});

			if (validatedData.status === "APPROVED") {
				// Cek total pembayaran yang disetujui untuk invoice ini
				const approvedSum = await tx.payment.aggregate({
					_sum: { amount: true },
					where: {
						invoiceId: existingPayment.invoiceId,
						verificationStatus: VerificationStatus.APPROVED,
					},
				});

				const totalPaid = Number(approvedSum._sum.amount ?? 0);
				const invoiceTotal = Number(existingPayment.invoice.totalAmount);

				if (totalPaid >= invoiceTotal) {
					await tx.invoice.update({
						where: { id: existingPayment.invoiceId },
						data: { invoiceStatus: InvoiceStatus.PAID },
					});
				}

				// Notifikasi buyer
				await tx.notification.create({
					data: {
						buyerId: existingPayment.buyerId,
						channel: NotificationChannel.IN_APP,
						type: NotificationType.PAYMENT_APPROVED,
						title: "Pembayaran Disetujui",
						body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} telah disetujui.`,
						triggeredByEvent: "PAYMENT_VERIFIED",
						referenceId: existingPayment.id,
					},
				});
			} else if (validatedData.status === "REJECTED") {
				// Notifikasi penolakan ke buyer
				await tx.notification.create({
					data: {
						buyerId: existingPayment.buyerId,
						channel: NotificationChannel.IN_APP,
						type: NotificationType.PAYMENT_REJECTED,
						title: "Pembayaran Ditolak",
						body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} ditolak. Alasan: ${validatedData.rejectReason}`,
						triggeredByEvent: "PAYMENT_REJECTED",
						referenceId: existingPayment.id,
					},
				});
			}

			return updatedPayment;
		});

		return res.status(200).json({
			success: true,
			message: `Pembayaran berhasil ${validatedData.status === "APPROVED" ? "disetujui" : "ditolak"}`,
			data: result,
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

		console.error("Error verifyPayment:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Bulk Verify Payments
export const bulkVerifyPayments = async (req: Request, res: Response) => {
	try {
		const validatedData = bulkVerifyPaymentSchema.parse(req.body);
		const adminUser = req.user;

		let updatedCount = 0;
		await prisma.$transaction(async (tx) => {
			for (const paymentId of validatedData.paymentIds) {
				const existingPayment = await tx.payment.findUnique({
					where: { id: paymentId },
					include: { invoice: true },
				});
				if (!existingPayment) continue;

				await tx.payment.update({
					where: { id: paymentId },
					data: {
						verificationStatus: validatedData.status,
						verifiedById: adminUser?.id ?? null,
						verifiedAt: new Date(),
						rejectReason:
							validatedData.status === "REJECTED"
								? (validatedData.rejectReason ?? null)
								: null,
					},
				});
				updatedCount++;

				if (validatedData.status === "APPROVED") {
					const approvedSum = await tx.payment.aggregate({
						_sum: { amount: true },
						where: {
							invoiceId: existingPayment.invoiceId,
							verificationStatus: VerificationStatus.APPROVED,
						},
					});

					const totalPaid = Number(approvedSum._sum.amount ?? 0);
					const invoiceTotal = Number(existingPayment.invoice.totalAmount);

					if (totalPaid >= invoiceTotal) {
						await tx.invoice.update({
							where: { id: existingPayment.invoiceId },
							data: { invoiceStatus: InvoiceStatus.PAID },
						});
					}

					await tx.notification.create({
						data: {
							buyerId: existingPayment.buyerId,
							channel: NotificationChannel.IN_APP,
							type: NotificationType.PAYMENT_APPROVED,
							title: "Pembayaran Disetujui",
							body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} telah disetujui.`,
							triggeredByEvent: "PAYMENT_VERIFIED",
							referenceId: existingPayment.id,
						},
					});
				} else if (validatedData.status === "REJECTED") {
					await tx.notification.create({
						data: {
							buyerId: existingPayment.buyerId,
							channel: NotificationChannel.IN_APP,
							type: NotificationType.PAYMENT_REJECTED,
							title: "Pembayaran Ditolak",
							body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} ditolak. Alasan: ${validatedData.rejectReason}`,
							triggeredByEvent: "PAYMENT_REJECTED",
							referenceId: existingPayment.id,
						},
					});
				}
			}
		});

		return res.status(200).json({
			success: true,
			message: `${updatedCount} pembayaran berhasil diperbarui ke status ${validatedData.status}`,
			data: { count: updatedCount },
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

		console.error("Error bulkVerifyPayments:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Create Manual Payment (Button "+ Tambah Pembayaran")
export const createPayment = async (req: Request, res: Response) => {
	try {
		const validatedData = createPaymentSchema.parse(req.body);
		const adminUser = req.user;

		// Verifikasi invoice ada
		const invoice = await prisma.invoice.findUnique({
			where: { id: validatedData.invoiceId },
		});

		if (!invoice) {
			return res.status(404).json({
				success: false,
				message: "Invoice dengan ID tersebut tidak ditemukan",
			});
		}

		const newPayment = await prisma.$transaction(async (tx) => {
			const payment = await tx.payment.create({
				data: {
					invoiceId: validatedData.invoiceId,
					buyerId: validatedData.buyerId,
					amount: validatedData.amount,
					paymentMethod: validatedData.paymentMethod,
					paymentDate: validatedData.paymentDate,
					paymentProofUrl: validatedData.paymentProofUrl ?? "",
					verificationStatus: VerificationStatus.APPROVED,
					verifiedById: adminUser?.id ?? null,
					verifiedAt: new Date(),
				},
				include: {
					buyer: { select: { id: true, name: true, email: true } },
					invoice: { include: { batch: true } },
				},
			});

			// Cek apakah invoice lunas
			const approvedSum = await tx.payment.aggregate({
				_sum: { amount: true },
				where: {
					invoiceId: validatedData.invoiceId,
					verificationStatus: VerificationStatus.APPROVED,
				},
			});

			const totalPaid = Number(approvedSum._sum.amount ?? 0);
			if (totalPaid >= Number(invoice.totalAmount)) {
				await tx.invoice.update({
					where: { id: validatedData.invoiceId },
					data: { invoiceStatus: InvoiceStatus.PAID },
				});
			}

			return payment;
		});

		return res.status(201).json({
			success: true,
			message: "Pembayaran manual berhasil dicatat",
			data: newPayment,
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

		console.error("Error createPayment:", error);
		return res.status(500).json({
			success: false,
			message: "Internal Server Error",
		});
	}
};

// Upload Bukti Bayar / Image to R2
export const uploadPaymentProof = async (req: Request, res: Response) => {
	try {
		if (!req.file) {
			return res.status(400).json({
				success: false,
				message: "File gambar tidak ditemukan dalam request (field 'file')",
			});
		}

		const publicUrl = await uploadToR2({
			fileBuffer: req.file.buffer,
			fileName: req.file.originalname,
			mimeType: req.file.mimetype,
			folder: "payment-proofs",
		});

		return res.status(200).json({
			success: true,
			message: "Bukti pembayaran berhasil diunggah",
			data: {
				url: publicUrl,
				fileName: req.file.originalname,
				size: req.file.size,
				mimeType: req.file.mimetype,
			},
		});
	} catch (error: unknown) {
		console.error("Error uploadPaymentProof:", error);
		return res.status(500).json({
			success: false,
			message:
				error instanceof Error
					? error.message
					: "Gagal mengunggah file ke Cloudflare R2",
		});
	}
};
