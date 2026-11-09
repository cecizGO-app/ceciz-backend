import type { Prisma } from "@/generated/prisma/client";
import {
	NotificationChannel,
	NotificationType,
	TaxInvoiceStatus,
	TrackingStatus,
	VerificationStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type {
	BulkVerifyTaxPaymentInput,
	GetTaxInvoicesAdminQuery,
	GetTaxPaymentsAdminQuery,
	ReleaseTaxInput,
	ReleaseTaxItemInput,
	VerifyTaxPaymentInput,
} from "./tax.schema.js";

interface BreakdownItem {
	itemId?: string;
	batch_id: string;
	batch_number: number;
	country: string;
	item_desc: string;
	qty: number;
	category?: string;
	rate_tax: number;
	subtotal_tax: number;
}

export interface PreviewItemResult {
	itemId: string;
	buyerId: string;
	buyerName: string;
	buyerIdLine: string | null;
	batchId: string;
	batchCode: string;
	countryCode: string;
	item: string;
	pcs: number;
	category: "PC" | "Non-PC";
	rateAcuan: number;
	rateLabel: string;
	subtotal: number;
}

function formatBatchCode(countryCode: string, batchNumber: number): string {
	return `${countryCode}-${String(batchNumber).padStart(3, "0")}`;
}

function formatInvoiceNumber(id: string): string {
	const suffix = id.length > 5 ? id.slice(-4).toUpperCase() : id.toUpperCase();
	return `TAX-${suffix}`;
}

export async function getTaxStats() {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [
		latestInvoice,
		unpaidInvoices,
		pendingVerificationsCount,
		paidPaymentsThisMonth,
		allInvoices,
	] = await Promise.all([
		prisma.taxInvoice.findFirst({
			orderBy: { createdAt: "desc" },
			select: { releaseName: true, releasePeriod: true },
		}),
		prisma.taxInvoice.findMany({
			where: {
				status: { not: TaxInvoiceStatus.PAID },
			},
			select: { taxInvoiceTotal: true },
		}),
		prisma.taxPayment.count({
			where: { taxVerificationStatus: VerificationStatus.PENDING },
		}),
		prisma.taxPayment.aggregate({
			where: {
				taxVerificationStatus: VerificationStatus.APPROVED,
				createdAt: { gte: startOfMonth },
			},
			_sum: { amount: true },
		}),
		prisma.taxInvoice.findMany({
			distinct: ["releasePeriod"],
			select: { releasePeriod: true },
			orderBy: { releasePeriod: "desc" },
		}),
	]);

	const outstandingAmount = unpaidInvoices.reduce(
		(sum, inv) => sum + Number(inv.taxInvoiceTotal),
		0,
	);

	return {
		activePeriod: latestInvoice?.releaseName ?? "Belum ada rilis",
		activePeriodMonth: latestInvoice?.releasePeriod ?? "-",
		outstandingAmount,
		outstandingInvoicesCount: unpaidInvoices.length,
		pendingVerificationCount: pendingVerificationsCount,
		paidThisMonthAmount: Number(paidPaymentsThisMonth._sum.amount ?? 0),
		availablePeriods: allInvoices.map((inv) => inv.releasePeriod),
	};
}

export async function getTaxInvoices(query: GetTaxInvoicesAdminQuery) {
	const { skip, take } = getPaginationArgs({
		page: query.page ?? 1,
		limit: query.limit ?? 20,
	});

	const andConditions: Prisma.TaxInvoiceWhereInput[] = [];

	if (query.period) {
		andConditions.push({ releasePeriod: query.period });
	}

	if (query.country) {
		andConditions.push({
			coveredBatchIds: { hasSome: [query.country] },
		});
	}

	if (query.search) {
		const searchTrimmed = query.search.trim();
		andConditions.push({
			OR: [
				{ id: { contains: searchTrimmed, mode: "insensitive" } },
				{ releaseName: { contains: searchTrimmed, mode: "insensitive" } },
				{ releasePeriod: { contains: searchTrimmed, mode: "insensitive" } },
				{
					buyer: {
						OR: [
							{ name: { contains: searchTrimmed, mode: "insensitive" } },
							{ idLine: { contains: searchTrimmed, mode: "insensitive" } },
							{ email: { contains: searchTrimmed, mode: "insensitive" } },
							{ contact: { contains: searchTrimmed, mode: "insensitive" } },
						],
					},
				},
			],
		});
	}

	if (query.status && query.status !== "ALL") {
		if (query.status === "PENDING") {
			andConditions.push({
				payments: {
					some: { taxVerificationStatus: VerificationStatus.PENDING },
				},
			});
		} else if (query.status === "UNPAID") {
			andConditions.push({
				status: { in: [TaxInvoiceStatus.RELEASED, TaxInvoiceStatus.DRAFT] },
				payments: {
					none: { taxVerificationStatus: VerificationStatus.PENDING },
				},
			});
		} else if (query.status === "PAID") {
			andConditions.push({ status: TaxInvoiceStatus.PAID });
		} else if (query.status === "OVERDUE") {
			andConditions.push({
				OR: [
					{ status: TaxInvoiceStatus.OVERDUE },
					{
						status: TaxInvoiceStatus.RELEASED,
						deadlinePayment: { lt: new Date() },
					},
				],
			});
		}
	}

	const where: Prisma.TaxInvoiceWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [invoices, total] = await Promise.all([
		prisma.taxInvoice.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
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
				payments: {
					select: {
						id: true,
						amount: true,
						taxVerificationStatus: true,
						createdAt: true,
					},
				},
			},
		}),
		prisma.taxInvoice.count({ where }),
	]);

	// Fetch covered batch info for formatting codes
	const allBatchIds = Array.from(
		new Set(invoices.flatMap((inv) => inv.coveredBatchIds)),
	);
	const batchMap = new Map<string, string>();
	if (allBatchIds.length > 0) {
		const batches = await prisma.batch.findMany({
			where: { id: { in: allBatchIds } },
			select: { id: true, countryCode: true, batchNumber: true },
		});
		for (const b of batches) {
			batchMap.set(b.id, formatBatchCode(b.countryCode, b.batchNumber));
		}
	}

	const data = invoices.map((inv) => {
		const breakdown = (
			Array.isArray(inv.breakdownDetail)
				? (inv.breakdownDetail as unknown as BreakdownItem[])
				: []
		) as BreakdownItem[];

		const totalItem = breakdown.reduce(
			(acc, item) => acc + (Number(item.qty) || 1),
			0,
		);

		// Format covered batches
		const coveredBatches = inv.coveredBatchIds.map((bId) => {
			return batchMap.get(bId) ?? bId;
		});

		// Build item summary (e.g. "2 PC, 1 Album, ...")
		const summaryMap = new Map<string, number>();
		for (const item of breakdown) {
			const cat = item.category || "PC";
			summaryMap.set(cat, (summaryMap.get(cat) ?? 0) + (Number(item.qty) || 1));
		}
		const itemSummary = Array.from(summaryMap.entries())
			.map(([cat, qty]) => `${qty} ${cat}`)
			.join(", ");

		const pendingPayments = inv.payments.filter(
			(p) => p.taxVerificationStatus === VerificationStatus.PENDING,
		);
		const hasPaymentProof = inv.payments.length > 0;

		let displayStatus: "Pending" | "Paid" | "Overdue" | "Unpaid" = "Unpaid";
		if (inv.status === TaxInvoiceStatus.PAID) {
			displayStatus = "Paid";
		} else if (pendingPayments.length > 0) {
			displayStatus = "Pending";
		} else if (
			inv.status === TaxInvoiceStatus.OVERDUE ||
			new Date(inv.deadlinePayment) < new Date()
		) {
			displayStatus = "Overdue";
		} else {
			displayStatus = "Unpaid";
		}

		return {
			id: inv.id,
			invoiceNumber: formatInvoiceNumber(inv.id),
			releaseName: inv.releaseName,
			releasePeriod: inv.releasePeriod,
			buyer: {
				id: inv.buyer.id,
				name: inv.buyer.name,
				email: inv.buyer.email,
				contact: inv.buyer.contact,
				idLine: inv.buyer.idLine,
				image: inv.buyer.image,
			},
			coveredBatches,
			totalItem: totalItem || breakdown.length || 1,
			itemSummary: itemSummary || `${breakdown.length} item`,
			breakdownDetail: breakdown,
			totalTax: Number(inv.taxInvoiceTotal),
			deadlinePayment: inv.deadlinePayment,
			maxCheckoutDate: inv.maxCheckoutDate,
			status: inv.status,
			displayStatus,
			hasPaymentProof,
			pendingPaymentsCount: pendingPayments.length,
			createdAt: inv.createdAt,
		};
	});

	return {
		data,
		meta: buildMeta(total, query.page ?? 1, query.limit ?? 20),
	};
}

export async function getTaxInvoiceById(id: string) {
	const taxInvoice = await prisma.taxInvoice.findUnique({
		where: { id },
		include: {
			buyer: {
				select: {
					id: true,
					name: true,
					email: true,
					contact: true,
					idLine: true,
					address: true,
					image: true,
				},
			},
			payments: {
				orderBy: { createdAt: "desc" },
				include: {
					verifiedBy: {
						select: { id: true, name: true, email: true },
					},
				},
			},
		},
	});

	if (!taxInvoice) {
		throw AppError.notFound("Tagihan tax tidak ditemukan");
	}

	const batchMap = new Map<string, string>();
	if (taxInvoice.coveredBatchIds.length > 0) {
		const batches = await prisma.batch.findMany({
			where: { id: { in: taxInvoice.coveredBatchIds } },
			select: { id: true, countryCode: true, batchNumber: true },
		});
		for (const b of batches) {
			batchMap.set(b.id, formatBatchCode(b.countryCode, b.batchNumber));
		}
	}

	const breakdown = (
		Array.isArray(taxInvoice.breakdownDetail)
			? (taxInvoice.breakdownDetail as unknown as BreakdownItem[])
			: []
	) as BreakdownItem[];

	return {
		id: taxInvoice.id,
		invoiceNumber: formatInvoiceNumber(taxInvoice.id),
		releaseName: taxInvoice.releaseName,
		releasePeriod: taxInvoice.releasePeriod,
		buyer: taxInvoice.buyer,
		coveredBatches: taxInvoice.coveredBatchIds.map(
			(bId) => batchMap.get(bId) ?? bId,
		),
		coveredBatchIds: taxInvoice.coveredBatchIds,
		breakdownDetail: breakdown,
		totalTax: Number(taxInvoice.taxInvoiceTotal),
		penaltyAmount: Number(taxInvoice.penaltyAmount),
		deadlinePayment: taxInvoice.deadlinePayment,
		maxCheckoutDate: taxInvoice.maxCheckoutDate,
		status: taxInvoice.status,
		createdAt: taxInvoice.createdAt,
		updatedAt: taxInvoice.updatedAt,
		payments: taxInvoice.payments.map((p) => ({
			id: p.id,
			amount: Number(p.amount),
			paymentMethod: p.paymentMethod,
			taxPaymentProofUrl: p.taxPaymentProofUrl,
			taxVerificationStatus: p.taxVerificationStatus,
			paymentDate: p.paymentDate,
			rejectReason: p.rejectReason,
			verifiedBy: p.verifiedBy,
			verifiedAt: p.verifiedAt,
			createdAt: p.createdAt,
		})),
	};
}

export async function getTaxPreview() {
	// 1. Get settings for tax rates
	const setting = await prisma.setting.findUnique({
		where: { id: "singleton" },
	});

	const ratePcChThJp = Number(setting?.taxRatePcChThJp ?? 7000);
	const ratePcKr = Number(setting?.taxRatePcKr ?? 6000);
	const rateNonPc = Number(setting?.taxRateNonPcPerGram ?? 48000);

	// 2. Find batches that have arrived at WH INA
	const batchesAtWhIna = await prisma.batch.findMany({
		where: {
			tracking: {
				trackingStatus: TrackingStatus.ARRIVED_WH_INA,
			},
		},
		include: {
			items: {
				include: {
					buyer: {
						select: {
							id: true,
							name: true,
							idLine: true,
							email: true,
						},
					},
				},
			},
		},
	});

	// 3. Find which items have already been invoiced for tax
	const existingTaxInvoices = await prisma.taxInvoice.findMany({
		select: {
			buyerId: true,
			coveredBatchIds: true,
			breakdownDetail: true,
		},
	});

	const taxedItemIds = new Set<string>();
	const buyerTaxedBatches = new Set<string>();

	for (const inv of existingTaxInvoices) {
		for (const bId of inv.coveredBatchIds) {
			buyerTaxedBatches.add(`${inv.buyerId}:${bId}`);
		}
		if (Array.isArray(inv.breakdownDetail)) {
			for (const item of inv.breakdownDetail as unknown as BreakdownItem[]) {
				if (item.itemId) {
					taxedItemIds.add(item.itemId);
				}
			}
		}
	}

	// 4. Collect eligible items
	const eligibleItems: PreviewItemResult[] = [];
	const uniqueBuyers = new Set<string>();
	const uniqueBatches = new Set<string>();
	let totalEstimatedTax = 0;

	for (const batch of batchesAtWhIna) {
		const batchCode = formatBatchCode(batch.countryCode, batch.batchNumber);

		for (const item of batch.items) {
			// Skip if item already has tax invoice
			if (taxedItemIds.has(item.id)) continue;
			if (buyerTaxedBatches.has(`${item.buyerId}:${batch.id}`)) continue;

			const descLower = item.description.toLowerCase();
			const isNonPc =
				descLower.includes("album") ||
				descLower.includes("non-pc") ||
				descLower.includes("non pc") ||
				descLower.includes("box") ||
				descLower.includes("lightstick");

			const category: "PC" | "Non-PC" = isNonPc ? "Non-PC" : "PC";
			let rate = ratePcChThJp;
			let rateLabel = `Rp ${ratePcChThJp.toLocaleString("id-ID")} / pcs`;

			if (category === "Non-PC") {
				rate = rateNonPc;
				rateLabel = "Per berat · 0,8 kg";
			} else if (batch.countryCode === "INA") {
				rate = 2000;
				rateLabel = "Rp 2.000 / pcs";
			} else if (batch.countryCode === "KR") {
				rate = ratePcKr;
				rateLabel = `Rp ${ratePcKr.toLocaleString("id-ID")} / pcs`;
			} else {
				rate = ratePcChThJp;
				rateLabel = `Rp ${ratePcChThJp.toLocaleString("id-ID")} / pcs`;
			}

			const subtotal = item.pcs * rate;
			totalEstimatedTax += subtotal;
			uniqueBuyers.add(item.buyerId);
			uniqueBatches.add(batch.id);

			eligibleItems.push({
				itemId: item.id,
				buyerId: item.buyerId,
				buyerName: item.buyer.name,
				buyerIdLine: item.buyer.idLine,
				batchId: batch.id,
				batchCode,
				countryCode: batch.countryCode,
				item: `${item.description} (${item.pcs} pcs)`,
				pcs: item.pcs,
				category,
				rateAcuan: rate,
				rateLabel,
				subtotal,
			});
		}
	}

	return {
		summary: {
			totalItems: eligibleItems.length,
			totalBuyers: uniqueBuyers.size,
			totalBatches: uniqueBatches.size,
			totalEstimatedTax,
		},
		items: eligibleItems,
	};
}

export async function releaseTaxInvoices(input: ReleaseTaxInput) {
	// If items are not passed in body, generate eligible items from preview logic
	let itemsToRelease: ReleaseTaxItemInput[] = input.items ?? [];

	if (itemsToRelease.length === 0) {
		const preview = await getTaxPreview();
		if (preview.items.length === 0) {
			throw AppError.badRequest(
				"Tidak ada item berstatus Arrived WH INA yang dapat ditagih tax",
			);
		}
		itemsToRelease = preview.items.map((it) => ({
			itemId: it.itemId,
			buyerId: it.buyerId,
			batchId: it.batchId,
			item: it.item,
			pcs: it.pcs,
			category: it.category,
			rateAcuan: it.rateAcuan,
			rateLabel: it.rateLabel,
			subtotal: it.subtotal,
		}));
	}

	// Read settings for default deadlines if not provided
	const setting = await prisma.setting.findUnique({
		where: { id: "singleton" },
	});
	const deadlineTaxHours = setting?.deadlineTaxHours ?? 72;
	const maxStorageDays = setting?.maxStorageDays ?? 60;

	const now = new Date();
	const defaultDeadline = new Date(
		now.getTime() + deadlineTaxHours * 60 * 60 * 1000,
	);
	const defaultMaxCheckout = new Date(
		now.getTime() + maxStorageDays * 24 * 60 * 60 * 1000,
	);

	const deadlinePayment = input.deadlinePayment ?? defaultDeadline;
	const maxCheckoutDate = input.maxCheckoutDate ?? defaultMaxCheckout;

	// Group items by buyerId
	const buyerItemMap = new Map<string, ReleaseTaxItemInput[]>();
	for (const it of itemsToRelease) {
		const list = buyerItemMap.get(it.buyerId) ?? [];
		list.push(it);
		buyerItemMap.set(it.buyerId, list);
	}

	// Fetch batch info for batch_number and countryCode
	const batchIds = Array.from(new Set(itemsToRelease.map((it) => it.batchId)));
	const batches = await prisma.batch.findMany({
		where: { id: { in: batchIds } },
		select: { id: true, countryCode: true, batchNumber: true },
	});
	const batchInfoMap = new Map(batches.map((b) => [b.id, b]));

	let totalNominalTax = 0;
	const createdInvoices = await prisma.$transaction(async (tx) => {
		const invoices = [];

		for (const [buyerId, items] of buyerItemMap.entries()) {
			const coveredBatchIds = Array.from(
				new Set(items.map((it) => it.batchId)),
			);

			const breakdownDetail: BreakdownItem[] = items.map((it) => {
				const bInfo = batchInfoMap.get(it.batchId);
				return {
					itemId: it.itemId,
					batch_id: it.batchId,
					batch_number: bInfo?.batchNumber ?? 0,
					country: bInfo?.countryCode ?? "ID",
					item_desc: it.item,
					qty: it.pcs,
					category: it.category,
					rate_tax: it.rateAcuan,
					subtotal_tax: it.subtotal,
				};
			});

			const taxInvoiceTotal = items.reduce(
				(sum, it) => sum + Number(it.subtotal),
				0,
			);
			totalNominalTax += taxInvoiceTotal;

			const invoice = await tx.taxInvoice.create({
				data: {
					releaseName: input.releaseName,
					releasePeriod: input.releasePeriod,
					buyerId,
					coveredBatchIds,
					breakdownDetail: breakdownDetail as unknown as Prisma.InputJsonValue,
					taxInvoiceTotal,
					deadlinePayment,
					maxCheckoutDate,
					status: TaxInvoiceStatus.RELEASED,
				},
				select: {
					id: true,
					releaseName: true,
					releasePeriod: true,
					taxInvoiceTotal: true,
					buyerId: true,
				},
			});

			// Create in-app notification for buyer
			await tx.notification.create({
				data: {
					buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.TAX_INVOICE_NEW,
					title: `Tagihan Tax Baru: ${input.releaseName}`,
					body: `Tagihan pajak untuk periode ${input.releasePeriod} sebesar Rp ${taxInvoiceTotal.toLocaleString("id-ID")} telah dirilis. Harap lakukan pembayaran sebelum deadline.`,
					triggeredByEvent: "TAX_INVOICE_RELEASED",
					referenceId: invoice.id,
				},
			});

			invoices.push(invoice);
		}

		return invoices;
	});

	return {
		success: true,
		message: `Berhasil merilis tagihan tax kepada ${createdInvoices.length} buyer`,
		totalInvoicesCreated: createdInvoices.length,
		totalNominalTax,
		invoices: createdInvoices,
	};
}

export async function getTaxPayments(query: GetTaxPaymentsAdminQuery) {
	const { skip, take } = getPaginationArgs({
		page: query.page ?? 1,
		limit: query.limit ?? 20,
	});

	const andConditions: Prisma.TaxPaymentWhereInput[] = [];

	if (query.status && query.status !== "ALL") {
		andConditions.push({
			taxVerificationStatus: query.status as VerificationStatus,
		});
	}

	if (query.search) {
		const searchTrimmed = query.search.trim();
		andConditions.push({
			OR: [
				{ id: { contains: searchTrimmed, mode: "insensitive" } },
				{ taxInvoiceId: { contains: searchTrimmed, mode: "insensitive" } },
				{
					buyer: {
						OR: [
							{ name: { contains: searchTrimmed, mode: "insensitive" } },
							{ idLine: { contains: searchTrimmed, mode: "insensitive" } },
							{ email: { contains: searchTrimmed, mode: "insensitive" } },
						],
					},
				},
			],
		});
	}

	const where: Prisma.TaxPaymentWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const [payments, total] = await Promise.all([
		prisma.taxPayment.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			include: {
				buyer: {
					select: {
						id: true,
						name: true,
						email: true,
						idLine: true,
						contact: true,
					},
				},
				taxInvoice: {
					select: {
						id: true,
						releaseName: true,
						releasePeriod: true,
						taxInvoiceTotal: true,
						status: true,
					},
				},
			},
		}),
		prisma.taxPayment.count({ where }),
	]);

	const data = payments.map((p) => ({
		id: p.id,
		taxInvoiceId: p.taxInvoiceId,
		invoiceNumber: formatInvoiceNumber(p.taxInvoiceId),
		buyer: p.buyer,
		amount: Number(p.amount),
		paymentMethod: p.paymentMethod,
		taxPaymentProofUrl: p.taxPaymentProofUrl,
		taxVerificationStatus: p.taxVerificationStatus,
		paymentDate: p.paymentDate,
		rejectReason: p.rejectReason,
		createdAt: p.createdAt,
		taxInvoice: {
			...p.taxInvoice,
			taxInvoiceTotal: Number(p.taxInvoice.taxInvoiceTotal),
		},
	}));

	return {
		data,
		meta: buildMeta(total, query.page ?? 1, query.limit ?? 20),
	};
}

export async function getTaxPaymentById(id: string) {
	const payment = await prisma.taxPayment.findUnique({
		where: { id },
		include: {
			buyer: {
				select: {
					id: true,
					name: true,
					email: true,
					idLine: true,
					contact: true,
				},
			},
			taxInvoice: true,
			verifiedBy: {
				select: { id: true, name: true, email: true },
			},
		},
	});

	if (!payment) {
		throw AppError.notFound("Pembayaran tax tidak ditemukan");
	}

	return {
		...payment,
		amount: Number(payment.amount),
		taxInvoice: {
			...payment.taxInvoice,
			taxInvoiceTotal: Number(payment.taxInvoice.taxInvoiceTotal),
		},
	};
}

export async function verifyTaxPayment(
	id: string,
	input: VerifyTaxPaymentInput,
	adminUserId?: string,
) {
	const existing = await prisma.taxPayment.findUnique({
		where: { id },
		include: { taxInvoice: true },
	});

	if (!existing) {
		throw AppError.notFound("Pembayaran tax tidak ditemukan");
	}

	const result = await prisma.$transaction(async (tx) => {
		const updatedPayment = await tx.taxPayment.update({
			where: { id },
			data: {
				taxVerificationStatus: input.status as VerificationStatus,
				verifiedById: adminUserId ?? null,
				verifiedAt: new Date(),
				rejectReason:
					input.status === "REJECTED" ? (input.rejectReason ?? null) : null,
			},
			include: {
				buyer: { select: { id: true, name: true, email: true } },
				taxInvoice: true,
			},
		});

		if (input.status === "APPROVED") {
			// Sum all approved payments for this tax invoice
			const approvedPayments = await tx.taxPayment.aggregate({
				where: {
					taxInvoiceId: existing.taxInvoiceId,
					taxVerificationStatus: VerificationStatus.APPROVED,
				},
				_sum: { amount: true },
			});

			const totalPaid = Number(approvedPayments._sum.amount ?? 0);
			const invoiceTotal = Number(existing.taxInvoice.taxInvoiceTotal);

			if (totalPaid >= invoiceTotal) {
				await tx.taxInvoice.update({
					where: { id: existing.taxInvoiceId },
					data: { status: TaxInvoiceStatus.PAID },
				});
			}

			// In-app notification
			await tx.notification.create({
				data: {
					buyerId: existing.buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.PAYMENT_APPROVED,
					title: "Pembayaran Tax Disetujui",
					body: `Pembayaran pajak untuk invoice ${existing.taxInvoice.releaseName} sebesar Rp ${Number(existing.amount).toLocaleString("id-ID")} telah diverifikasi dan disetujui.`,
					triggeredByEvent: "TAX_PAYMENT_VERIFIED",
					referenceId: existing.id,
				},
			});
		} else if (input.status === "REJECTED") {
			// In-app notification
			await tx.notification.create({
				data: {
					buyerId: existing.buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.PAYMENT_REJECTED,
					title: "Pembayaran Tax Ditolak",
					body: `Pembayaran pajak untuk invoice ${existing.taxInvoice.releaseName} ditolak. Alasan: ${input.rejectReason ?? "Bukti transfer tidak valid"}. Silakan upload ulang bukti bayar.`,
					triggeredByEvent: "TAX_PAYMENT_REJECTED",
					referenceId: existing.id,
				},
			});
		}

		return updatedPayment;
	});

	return {
		id: result.id,
		taxVerificationStatus: result.taxVerificationStatus,
		rejectReason: result.rejectReason,
		verifiedAt: result.verifiedAt,
	};
}

export async function bulkVerifyTaxPayments(
	input: BulkVerifyTaxPaymentInput,
	adminUserId?: string,
) {
	const results = [];
	for (const paymentId of input.paymentIds) {
		try {
			const res = await verifyTaxPayment(
				paymentId,
				{
					status: input.status,
					rejectReason: input.rejectReason,
				},
				adminUserId,
			);
			results.push({ id: paymentId, success: true, data: res });
		} catch (err: unknown) {
			results.push({
				id: paymentId,
				success: false,
				error: (err as Error).message,
			});
		}
	}

	return {
		totalProcessed: results.length,
		successfulCount: results.filter((r) => r.success).length,
		failedCount: results.filter((r) => !r.success).length,
		results,
	};
}
