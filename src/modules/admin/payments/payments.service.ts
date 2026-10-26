import type { Prisma } from "@/generated/prisma/client";
import {
	CountryCode,
	InvoiceStatus,
	NotificationChannel,
	NotificationType,
	VerificationStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import type {
	BulkVerifyPaymentInput,
	CreatePaymentInput,
	GetPaymentQueryInput,
	VerifyPaymentInput,
} from "./payments.schema.js";

export async function getPaymentStats() {
	const now = new Date();
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
		prisma.payment.count({
			where: { verificationStatus: VerificationStatus.PENDING },
		}),
		prisma.payment.count({
			where: {
				verificationStatus: VerificationStatus.PENDING,
				createdAt: { gte: startOfDay },
			},
		}),
		prisma.payment.count({
			where: {
				verificationStatus: VerificationStatus.APPROVED,
				verifiedAt: { gte: startOfDay },
			},
		}),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: {
				verificationStatus: VerificationStatus.APPROVED,
				verifiedAt: { gte: startOfDay },
			},
		}),
		prisma.payment.count({
			where: {
				verificationStatus: VerificationStatus.REJECTED,
				verifiedAt: { gte: startOfDay },
			},
		}),
		prisma.payment.aggregate({
			_sum: { amount: true },
			where: {
				verificationStatus: VerificationStatus.APPROVED,
				verifiedAt: { gte: startOfMonth },
			},
		}),
		prisma.payment.count({
			where: { verificationStatus: VerificationStatus.APPROVED },
		}),
		prisma.payment.count({
			where: { verificationStatus: VerificationStatus.REJECTED },
		}),
		prisma.payment.count(),
	]);

	return {
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
		tabCounts: {
			pending: totalPending,
			approved: totalApprovedAll,
			rejected: totalRejectedAll,
			all: totalAll,
		},
	};
}

export async function getPayments(query: GetPaymentQueryInput) {
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

		// Search nominal (format Indonesia e.g. 100.000, 100.000,50, Rp 100.000, atau nominal biasa 100000)
		const numericCandidate = searchTrimmed
			.replace(/^(?:rp\.?|idr)\s*/i, "")
			.trim();
		if (
			/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(numericCandidate) ||
			/^\d+(?:[.,]\d+)?$/.test(numericCandidate)
		) {
			const cleanNumStr = numericCandidate
				.replace(/\./g, "")
				.replace(/,/g, ".");
			const searchNum = parseFloat(cleanNumStr);
			if (!Number.isNaN(searchNum) && searchNum > 0) {
				orConditions.push({ amount: searchNum });
			}
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
						penaltyAmount: true,
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
		if (p.notes?.trim()) {
			keterangan = p.notes.trim();
		} else if (Array.isArray(p.invoice?.itemDetail)) {
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
			penaltyAmount: Number(p.invoice?.penaltyAmount ?? 0),
			notes: p.notes,
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

	const pagination =
		page && limit && total !== undefined
			? {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				}
			: undefined;

	return { data: mappedPayments, pagination };
}

export async function getPaymentById(id: string) {
	if (!id || typeof id !== "string") {
		throw AppError.badRequest("ID pembayaran wajib disertakan dan harus valid");
	}

	const payment = await prisma.payment.findUnique({
		where: { id },
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
		throw AppError.notFound("Pembayaran tidak ditemukan");
	}

	return payment;
}

export async function verifyPayment(
	id: string,
	input: VerifyPaymentInput,
	adminUserId?: string,
) {
	if (!id || typeof id !== "string") {
		throw AppError.badRequest("ID pembayaran wajib disertakan dan harus valid");
	}

	const existingPayment = await prisma.payment.findUnique({
		where: { id },
		include: { invoice: true },
	});

	if (!existingPayment) {
		throw AppError.notFound("Pembayaran tidak ditemukan");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedPayment = await tx.payment.update({
			where: { id },
			data: {
				verificationStatus: input.status,
				verifiedById: adminUserId ?? null,
				verifiedAt: new Date(),
				rejectReason:
					input.status === "REJECTED" ? (input.rejectReason ?? null) : null,
			},
			include: {
				buyer: { select: { id: true, name: true, email: true } },
				invoice: { include: { batch: true } },
				verifiedBy: { select: { id: true, name: true } },
			},
		});

		if (input.status === "APPROVED") {
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
		} else if (input.status === "REJECTED") {
			const approvedSum = await tx.payment.aggregate({
				_sum: { amount: true },
				where: {
					invoiceId: existingPayment.invoiceId,
					verificationStatus: VerificationStatus.APPROVED,
				},
			});

			const totalPaid = Number(approvedSum._sum.amount ?? 0);
			const invoiceTotal = Number(existingPayment.invoice.totalAmount);

			if (totalPaid < invoiceTotal) {
				const pendingCount = await tx.payment.count({
					where: {
						invoiceId: existingPayment.invoiceId,
						verificationStatus: VerificationStatus.PENDING,
					},
				});

				const isOverdue =
					new Date() > new Date(existingPayment.invoice.deadlinePayment);

				const revertedStatus =
					pendingCount > 0
						? InvoiceStatus.AWAITING_VERIFICATION
						: isOverdue
							? InvoiceStatus.OVERDUE
							: InvoiceStatus.UNPAID;

				await tx.invoice.update({
					where: { id: existingPayment.invoiceId },
					data: { invoiceStatus: revertedStatus },
				});
			}

			// Notifikasi penolakan ke buyer
			await tx.notification.create({
				data: {
					buyerId: existingPayment.buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.PAYMENT_REJECTED,
					title: "Pembayaran Ditolak",
					body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} ditolak. Alasan: ${input.rejectReason}`,
					triggeredByEvent: "PAYMENT_REJECTED",
					referenceId: existingPayment.id,
				},
			});
		}

		return updatedPayment;
	});

	return result;
}

export async function bulkVerifyPayments(
	input: BulkVerifyPaymentInput,
	adminUserId?: string,
) {
	let updatedCount = 0;
	await prisma.$transaction(async (tx) => {
		for (const paymentId of input.paymentIds) {
			const existingPayment = await tx.payment.findUnique({
				where: { id: paymentId },
				include: { invoice: true },
			});
			if (!existingPayment) continue;

			await tx.payment.update({
				where: { id: paymentId },
				data: {
					verificationStatus: input.status,
					verifiedById: adminUserId ?? null,
					verifiedAt: new Date(),
					rejectReason:
						input.status === "REJECTED" ? (input.rejectReason ?? null) : null,
				},
			});
			updatedCount++;

			if (input.status === "APPROVED") {
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
			} else if (input.status === "REJECTED") {
				const approvedSum = await tx.payment.aggregate({
					_sum: { amount: true },
					where: {
						invoiceId: existingPayment.invoiceId,
						verificationStatus: VerificationStatus.APPROVED,
					},
				});

				const totalPaid = Number(approvedSum._sum.amount ?? 0);
				const invoiceTotal = Number(existingPayment.invoice.totalAmount);

				if (totalPaid < invoiceTotal) {
					const pendingCount = await tx.payment.count({
						where: {
							invoiceId: existingPayment.invoiceId,
							verificationStatus: VerificationStatus.PENDING,
						},
					});

					const isOverdue =
						new Date() > new Date(existingPayment.invoice.deadlinePayment);

					const revertedStatus =
						pendingCount > 0
							? InvoiceStatus.AWAITING_VERIFICATION
							: isOverdue
								? InvoiceStatus.OVERDUE
								: InvoiceStatus.UNPAID;

					await tx.invoice.update({
						where: { id: existingPayment.invoiceId },
						data: { invoiceStatus: revertedStatus },
					});
				}

				await tx.notification.create({
					data: {
						buyerId: existingPayment.buyerId,
						channel: NotificationChannel.IN_APP,
						type: NotificationType.PAYMENT_REJECTED,
						title: "Pembayaran Ditolak",
						body: `Pembayaran sebesar Rp ${Number(existingPayment.amount).toLocaleString("id-ID")} ditolak. Alasan: ${input.rejectReason}`,
						triggeredByEvent: "PAYMENT_REJECTED",
						referenceId: existingPayment.id,
					},
				});
			}
		}
	});

	return { count: updatedCount };
}

export async function createPayment(
	input: CreatePaymentInput,
	adminUserId?: string,
) {
	// Cari invoice: langsung via invoiceId, atau via buyerId + batchId
	const invoice = input.invoiceId
		? await prisma.invoice.findUnique({ where: { id: input.invoiceId } })
		: await prisma.invoice.findFirst({
				where: { buyerId: input.buyerId, batchId: input.batchId as string },
			});

	if (!invoice) {
		throw AppError.notFound(
			"Invoice untuk buyer dan batch tersebut tidak ditemukan",
		);
	}

	if (invoice.buyerId !== input.buyerId) {
		throw AppError.badRequest("Buyer ID tidak sesuai dengan pemilik invoice");
	}

	const isApproved = input.status === "APPROVED";

	const newPayment = await prisma.$transaction(async (tx) => {
		const payment = await tx.payment.create({
			data: {
				invoiceId: invoice.id,
				buyerId: input.buyerId,
				amount: input.amount,
				paymentMethod: input.paymentMethod,
				paymentDate: input.paymentDate,
				paymentProofUrl: input.paymentProofUrl ?? "",
				notes: input.notes ?? null,
				verificationStatus: isApproved
					? VerificationStatus.APPROVED
					: VerificationStatus.PENDING,
				verifiedById: isApproved ? (adminUserId ?? null) : null,
				verifiedAt: isApproved ? new Date() : null,
			},
			include: {
				buyer: { select: { id: true, name: true, email: true } },
				invoice: { include: { batch: true } },
			},
		});

		if (isApproved) {
			const approvedSum = await tx.payment.aggregate({
				_sum: { amount: true },
				where: {
					invoiceId: invoice.id,
					verificationStatus: VerificationStatus.APPROVED,
				},
			});

			const totalPaid = Number(approvedSum._sum.amount ?? 0);
			if (totalPaid >= Number(invoice.totalAmount)) {
				await tx.invoice.update({
					where: { id: invoice.id },
					data: { invoiceStatus: InvoiceStatus.PAID },
				});
			}

			await tx.notification.create({
				data: {
					buyerId: input.buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.PAYMENT_APPROVED,
					title: "Pembayaran Disetujui",
					body: `Pembayaran sebesar Rp ${input.amount.toLocaleString("id-ID")} telah dicatat dan disetujui.`,
					triggeredByEvent: "PAYMENT_MANUAL_CREATED",
					referenceId: payment.id,
				},
			});
		} else if (invoice.invoiceStatus !== InvoiceStatus.PAID) {
			await tx.invoice.update({
				where: { id: invoice.id },
				data: { invoiceStatus: InvoiceStatus.AWAITING_VERIFICATION },
			});
		}

		return payment;
	});

	return newPayment;
}

export async function lookupInvoice(buyerId: string, batchId: string) {
	const invoice = await prisma.invoice.findFirst({
		where: { buyerId, batchId },
		include: {
			batch: {
				select: {
					id: true,
					countryCode: true,
					batchNumber: true,
					title: true,
				},
			},
			payments: {
				where: { verificationStatus: VerificationStatus.APPROVED },
				select: { amount: true },
			},
		},
	});

	if (!invoice) {
		throw AppError.notFound(
			"Buyer belum memiliki invoice di batch ini. Tambahkan pesanan buyer ke batch terlebih dahulu.",
		);
	}

	const totalPaid = invoice.payments.reduce(
		(sum, p) => sum + Number(p.amount),
		0,
	);
	const totalAmount = Number(invoice.totalAmount);
	const penaltyAmount = Number(invoice.penaltyAmount);

	return {
		invoiceId: invoice.id,
		buyerId: invoice.buyerId,
		batch: {
			id: invoice.batch.id,
			code: `${invoice.batch.countryCode}-${String(invoice.batch.batchNumber).padStart(3, "0")}`,
			title: invoice.batch.title,
		},
		invoiceStatus: invoice.invoiceStatus,
		totalAmount,
		penaltyAmount,
		totalPaid,
		remainingAmount: Math.max(totalAmount + penaltyAmount - totalPaid, 0),
		deadlinePayment: invoice.deadlinePayment,
	};
}

export async function getPaymentBatchOptions() {
	const batches = await prisma.batch.findMany({
		where: { invoices: { some: {} } },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			countryCode: true,
			batchNumber: true,
			title: true,
		},
	});

	return batches.map((b) => ({
		id: b.id,
		code: `${b.countryCode}-${String(b.batchNumber).padStart(3, "0")}`,
		title: b.title,
		countryCode: b.countryCode,
		batchNumber: b.batchNumber,
	}));
}

export async function uploadPaymentProof(file?: Express.Multer.File) {
	if (!file) {
		throw AppError.badRequest(
			"File gambar tidak ditemukan dalam request (field 'file')",
		);
	}

	const publicUrl = await uploadToR2({
		fileBuffer: file.buffer,
		fileName: file.originalname,
		mimeType: file.mimetype,
		folder: "payment-proofs",
	});

	return {
		url: publicUrl,
		fileName: file.originalname,
		size: file.size,
		mimeType: file.mimetype,
	};
}
