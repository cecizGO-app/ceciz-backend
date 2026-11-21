import type { Prisma } from "@/generated/prisma/client";
import {
	CountryCode,
	InvoiceStatus,
	NotificationChannel,
	NotificationType,
	OrderStatus,
	VerificationStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { calcOverdueDays, calcPenalty } from "@/services/penalty.service";
import type {
	GenerateInvoicesInput,
	GetInvoicesAdminQuery,
	WaivePenaltyInput,
} from "./invoices.schema.js";

// ==========================================
// Helpers
// ==========================================

type DbClient = typeof prisma | Prisma.TransactionClient;

interface InvoiceItemDetail {
	item_name: string;
	qty: number;
	harga_per_buyer: number;
}

export type DraftAction =
	| "CREATE"
	| "UPDATE"
	| "UNCHANGED"
	| "LOCKED"
	| "SKIP_MISSING_PRICE";

const BATCH_CODE_REGEX = /^(CH|KR|TH|JP|INA)-?(\d+)$/i;

export function formatBatchCode(countryCode: string, batchNumber: number) {
	return `${countryCode}-${String(batchNumber).padStart(3, "0")}`;
}

export function formatInvoiceNumber(id: string) {
	return `INV-${id.slice(-6).toUpperCase()}`;
}

/**
 * Status efektif: invoice UNPAID yang sudah lewat deadline ditampilkan sebagai OVERDUE
 * walaupun kolom DB belum di-update oleh cron.
 */
export function resolveEffectiveStatus(
	status: InvoiceStatus,
	deadline: Date,
	now: Date = new Date(),
): InvoiceStatus {
	if (status === InvoiceStatus.UNPAID && deadline.getTime() < now.getTime()) {
		return InvoiceStatus.OVERDUE;
	}
	return status;
}

function parseItemDetail(raw: unknown): InvoiceItemDetail[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((row) => {
		const r = (row ?? {}) as Record<string, unknown>;
		return {
			item_name: String(r.item_name ?? ""),
			qty: Number(r.qty ?? 0),
			harga_per_buyer: Number(r.harga_per_buyer ?? 0),
		};
	});
}

async function getInvoiceSettings(client: DbClient = prisma) {
	const settings = await client.setting.findUnique({
		where: { id: "singleton" },
		select: { penaltyPerDay: true, deadlineBatchHours: true },
	});
	return {
		penaltyPerDay: Number(settings?.penaltyPerDay ?? 2000),
		deadlineBatchHours: settings?.deadlineBatchHours ?? 24,
	};
}

function computePenalty(
	invoice: {
		invoiceStatus: InvoiceStatus;
		deadlinePayment: Date;
		penaltyWaived: boolean;
	},
	penaltyPerDay: number,
	now: Date,
) {
	if (invoice.invoiceStatus === InvoiceStatus.PAID) {
		return { overdueDays: 0, penaltyAmount: 0 };
	}
	return {
		overdueDays: calcOverdueDays(invoice.deadlinePayment, now),
		penaltyAmount: calcPenalty(
			invoice.deadlinePayment,
			penaltyPerDay,
			invoice.penaltyWaived,
			now,
		),
	};
}

function buildStatusWhere(
	status: GetInvoicesAdminQuery["status"],
	now: Date,
): Prisma.InvoiceWhereInput | undefined {
	switch (status) {
		case "UNPAID":
			return {
				invoiceStatus: InvoiceStatus.UNPAID,
				deadlinePayment: { gte: now },
			};
		case "OVERDUE":
			return {
				OR: [
					{ invoiceStatus: InvoiceStatus.OVERDUE },
					{
						invoiceStatus: InvoiceStatus.UNPAID,
						deadlinePayment: { lt: now },
					},
				],
			};
		case "AWAITING_VERIFICATION":
			return { invoiceStatus: InvoiceStatus.AWAITING_VERIFICATION };
		case "PAID":
			return { invoiceStatus: InvoiceStatus.PAID };
		default:
			return undefined;
	}
}

function buildSearchWhere(search: string): Prisma.InvoiceWhereInput {
	const or: Prisma.InvoiceWhereInput[] = [
		{ buyer: { name: { contains: search, mode: "insensitive" } } },
		{ buyer: { email: { contains: search, mode: "insensitive" } } },
		{ buyer: { idLine: { contains: search, mode: "insensitive" } } },
		{ batch: { title: { contains: search, mode: "insensitive" } } },
	];

	// Nomor invoice: "INV-AB12CD" atau potongan id
	const invoiceSuffix = search.replace(/^INV-/i, "").trim().toLowerCase();
	if (invoiceSuffix.length >= 3) {
		or.push({ id: { endsWith: invoiceSuffix } });
	}

	// Kode batch: "CH-015" / "ch15"
	const batchMatch = search.match(BATCH_CODE_REGEX);
	if (batchMatch) {
		or.push({
			batch: {
				countryCode: batchMatch[1]?.toUpperCase() as CountryCode,
				batchNumber: Number(batchMatch[2]),
			},
		});
	}

	return { OR: or };
}

// ==========================================
// 1. Stats (4 kartu)
// ==========================================

export async function getInvoiceStats() {
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const { penaltyPerDay } = await getInvoiceSettings();

	const [allAgg, unpaidInvoices, pendingProofCount, paidThisMonth] =
		await Promise.all([
			prisma.invoice.aggregate({
				_sum: { totalAmount: true },
				_count: { _all: true },
			}),
			prisma.invoice.findMany({
				where: { invoiceStatus: { not: InvoiceStatus.PAID } },
				select: {
					totalAmount: true,
					invoiceStatus: true,
					deadlinePayment: true,
					penaltyWaived: true,
				},
			}),
			prisma.payment.count({
				where: { verificationStatus: VerificationStatus.PENDING },
			}),
			prisma.payment.aggregate({
				where: {
					verificationStatus: VerificationStatus.APPROVED,
					verifiedAt: { gte: startOfMonth },
				},
				_sum: { amount: true },
				_count: { _all: true },
			}),
		]);

	let outstandingAmount = 0;
	let outstandingPenalty = 0;
	let overdueCount = 0;
	for (const inv of unpaidInvoices) {
		outstandingAmount += Number(inv.totalAmount);
		outstandingPenalty += computePenalty(inv, penaltyPerDay, now).penaltyAmount;
		if (
			resolveEffectiveStatus(inv.invoiceStatus, inv.deadlinePayment, now) ===
			InvoiceStatus.OVERDUE
		) {
			overdueCount++;
		}
	}

	return {
		totalInvoices: {
			count: allAgg._count._all,
			amount: Number(allAgg._sum.totalAmount ?? 0),
		},
		outstanding: {
			count: unpaidInvoices.length,
			amount: outstandingAmount,
			runningPenalty: outstandingPenalty,
			overdueCount,
		},
		awaitingVerification: {
			count: pendingProofCount,
		},
		paidThisMonth: {
			count: paidThisMonth._count._all,
			amount: Number(paidThisMonth._sum.amount ?? 0),
		},
	};
}

// ==========================================
// 2. Draft builder (dipakai preview & generate)
// ==========================================

async function buildBatchInvoiceDrafts(client: DbClient, batchId: string) {
	const batch = await client.batch.findUnique({
		where: { id: batchId },
		select: {
			id: true,
			title: true,
			countryCode: true,
			batchNumber: true,
			status: true,
			feeGo: true,
			feeRekap: true,
			items: {
				orderBy: { createdAt: "asc" },
				select: {
					buyerId: true,
					description: true,
					pcs: true,
					hargaPerBuyer: true,
					hargaJualPerBuyer: true,
					buyer: { select: { id: true, name: true, idLine: true } },
				},
			},
			invoices: {
				select: {
					id: true,
					buyerId: true,
					totalAmount: true,
					itemDetail: true,
					invoiceStatus: true,
					deadlinePayment: true,
					payments: {
						where: { verificationStatus: VerificationStatus.APPROVED },
						select: { id: true },
					},
				},
			},
		},
	});

	if (!batch) {
		throw new AppError(404, "BATCH_NOT_FOUND", "Batch tidak ditemukan");
	}

	const isJp = batch.countryCode === CountryCode.JP;
	const invoiceByBuyer = new Map(batch.invoices.map((i) => [i.buyerId, i]));

	const itemsByBuyer = new Map<string, typeof batch.items>();
	for (const item of batch.items) {
		const list = itemsByBuyer.get(item.buyerId) ?? [];
		list.push(item);
		itemsByBuyer.set(item.buyerId, list);
	}

	const drafts = [...itemsByBuyer.entries()].map(([buyerId, items]) => {
		let missingPrice = false;
		const itemDetail: InvoiceItemDetail[] = items.map((i) => {
			const rawPrice = isJp
				? (i.hargaJualPerBuyer ?? i.hargaPerBuyer)
				: i.hargaPerBuyer;
			if (rawPrice === null || rawPrice === undefined) missingPrice = true;
			return {
				item_name: i.description,
				qty: i.pcs || 1,
				harga_per_buyer: Math.round(Number(rawPrice ?? 0)),
			};
		});

		const totalQty = itemDetail.reduce((s, i) => s + i.qty, 0);
		const totalAmount = itemDetail.reduce(
			(s, i) => s + i.harga_per_buyer * i.qty,
			0,
		);

		const existing = invoiceByBuyer.get(buyerId) ?? null;
		let action: DraftAction;
		if (missingPrice) {
			action = "SKIP_MISSING_PRICE";
		} else if (!existing) {
			action = "CREATE";
		} else if (
			existing.invoiceStatus === InvoiceStatus.PAID ||
			existing.payments.length > 0
		) {
			action = "LOCKED";
		} else if (
			Number(existing.totalAmount) === totalAmount &&
			JSON.stringify(parseItemDetail(existing.itemDetail)) ===
				JSON.stringify(itemDetail)
		) {
			action = "UNCHANGED";
		} else {
			action = "UPDATE";
		}

		const buyer = items[0]?.buyer;
		return {
			buyerId,
			buyerName: buyer?.name ?? buyerId,
			buyerIdLine: buyer?.idLine ?? null,
			totalQty,
			totalAmount,
			itemDetail,
			action,
			existingInvoice: existing
				? {
						id: existing.id,
						invoiceNumber: formatInvoiceNumber(existing.id),
						totalAmount: Number(existing.totalAmount),
						invoiceStatus: existing.invoiceStatus,
						deadlinePayment: existing.deadlinePayment,
					}
				: null,
		};
	});

	// Invoice yang buyer-nya sudah tidak punya item di batch (mis. setelah oper slot)
	const orphanInvoices = batch.invoices
		.filter((inv) => !itemsByBuyer.has(inv.buyerId))
		.map((inv) => ({
			id: inv.id,
			invoiceNumber: formatInvoiceNumber(inv.id),
			buyerId: inv.buyerId,
			totalAmount: Number(inv.totalAmount),
			invoiceStatus: inv.invoiceStatus,
		}));

	return { batch, drafts, orphanInvoices };
}

function summarizeDrafts(
	drafts: Awaited<ReturnType<typeof buildBatchInvoiceDrafts>>["drafts"],
) {
	const count = (a: DraftAction) => drafts.filter((d) => d.action === a).length;
	return {
		totalBuyers: drafts.length,
		totalPcs: drafts.reduce((s, d) => s + d.totalQty, 0),
		totalAmount: drafts.reduce((s, d) => s + d.totalAmount, 0),
		create: count("CREATE"),
		update: count("UPDATE"),
		unchanged: count("UNCHANGED"),
		locked: count("LOCKED"),
		skippedMissingPrice: count("SKIP_MISSING_PRICE"),
	};
}

export async function getInvoicePreview(batchId: string) {
	const { batch, drafts, orphanInvoices } = await buildBatchInvoiceDrafts(
		prisma,
		batchId,
	);
	const { deadlineBatchHours } = await getInvoiceSettings();

	return {
		batch: {
			id: batch.id,
			code: formatBatchCode(batch.countryCode, batch.batchNumber),
			title: batch.title,
			countryCode: batch.countryCode,
			status: batch.status,
			feeGo: Number(batch.feeGo),
			feeRekap: Number(batch.feeRekap),
		},
		defaultDeadlinePayment: new Date(
			Date.now() + deadlineBatchHours * 60 * 60 * 1000,
		),
		summary: summarizeDrafts(drafts),
		buyers: drafts,
		orphanInvoices,
	};
}

// ==========================================
// 3. Generate
// ==========================================

export async function generateInvoices(input: GenerateInvoicesInput) {
	const { deadlineBatchHours } = await getInvoiceSettings();
	const deadlinePayment =
		input.deadlinePayment ??
		new Date(Date.now() + deadlineBatchHours * 60 * 60 * 1000);

	return prisma.$transaction(
		async (tx) => {
			const { batch, drafts } = await buildBatchInvoiceDrafts(
				tx,
				input.batchId,
			);
			const batchCode = formatBatchCode(batch.countryCode, batch.batchNumber);
			const buyerFilter = input.buyerIds?.length
				? new Set(input.buyerIds)
				: null;
			const targets = buyerFilter
				? drafts.filter((d) => buyerFilter.has(d.buyerId))
				: drafts;

			if (targets.length === 0) {
				throw AppError.badRequest(
					"Tidak ada buyer yang bisa dibuatkan invoice pada batch ini",
				);
			}

			const results: Array<{
				buyerId: string;
				buyerName: string;
				action: DraftAction | "SKIPPED_UPDATE_DISABLED";
				invoiceId: string | null;
				invoiceNumber: string | null;
				totalAmount: number;
			}> = [];

			for (const draft of targets) {
				const shouldCreate = draft.action === "CREATE";
				const shouldUpdate = draft.action === "UPDATE" && input.updateExisting;

				if (!shouldCreate && !shouldUpdate) {
					results.push({
						buyerId: draft.buyerId,
						buyerName: draft.buyerName,
						action:
							draft.action === "UPDATE"
								? "SKIPPED_UPDATE_DISABLED"
								: draft.action,
						invoiceId: draft.existingInvoice?.id ?? null,
						invoiceNumber: draft.existingInvoice?.invoiceNumber ?? null,
						totalAmount: draft.totalAmount,
					});
					continue;
				}

				// Sinkronkan Order buyer
				const existingOrder = await tx.order.findFirst({
					where: { batchId: batch.id, buyerId: draft.buyerId },
					select: { id: true },
				});
				if (existingOrder) {
					await tx.order.update({
						where: { id: existingOrder.id },
						data: { itemQty: draft.totalQty },
					});
				} else {
					await tx.order.create({
						data: {
							batchId: batch.id,
							buyerId: draft.buyerId,
							itemQty: draft.totalQty,
							orderStatus: OrderStatus.CONFIRMED,
						},
					});
				}

				const itemDetailJson =
					draft.itemDetail as unknown as Prisma.InputJsonValue;
				const invoice = shouldCreate
					? await tx.invoice.create({
							data: {
								buyerId: draft.buyerId,
								batchId: batch.id,
								totalAmount: draft.totalAmount,
								itemDetail: itemDetailJson,
								invoiceStatus: InvoiceStatus.UNPAID,
								deadlinePayment,
							},
						})
					: await tx.invoice.update({
							where: { id: draft.existingInvoice?.id as string },
							data: {
								totalAmount: draft.totalAmount,
								itemDetail: itemDetailJson,
							},
						});

				if (input.notifyBuyers) {
					const amountLabel = draft.totalAmount.toLocaleString("id-ID");
					await tx.notification.create({
						data: {
							buyerId: draft.buyerId,
							channel: NotificationChannel.IN_APP,
							type: NotificationType.INVOICE_NEW,
							title: shouldCreate ? "Invoice Baru" : "Invoice Diperbarui",
							body: shouldCreate
								? `Tagihan batch ${batchCode} sebesar Rp ${amountLabel} telah diterbitkan.`
								: `Tagihan batch ${batchCode} diperbarui menjadi Rp ${amountLabel}.`,
							triggeredByEvent: shouldCreate
								? "INVOICE_GENERATED"
								: "INVOICE_REGENERATED",
							referenceId: invoice.id,
						},
					});
				}

				results.push({
					buyerId: draft.buyerId,
					buyerName: draft.buyerName,
					action: draft.action,
					invoiceId: invoice.id,
					invoiceNumber: formatInvoiceNumber(invoice.id),
					totalAmount: draft.totalAmount,
				});
			}

			const count = (a: string) => results.filter((r) => r.action === a).length;
			return {
				batch: {
					id: batch.id,
					code: batchCode,
					title: batch.title,
				},
				deadlinePayment,
				summary: {
					processed: results.length,
					created: count("CREATE"),
					updated: count("UPDATE"),
					unchanged: count("UNCHANGED"),
					locked: count("LOCKED"),
					skippedMissingPrice: count("SKIP_MISSING_PRICE"),
					skippedUpdateDisabled: count("SKIPPED_UPDATE_DISABLED"),
				},
				results,
			};
		},
		{ timeout: 30_000 },
	);
}

// ==========================================
// 4. List
// ==========================================

export async function getInvoices(query: GetInvoicesAdminQuery) {
	const now = new Date();
	const { skip, take } = getPaginationArgs(query);
	const { penaltyPerDay } = await getInvoiceSettings();

	const and: Prisma.InvoiceWhereInput[] = [];
	const statusWhere = buildStatusWhere(query.status, now);
	if (statusWhere) and.push(statusWhere);
	if (query.batchId) and.push({ batchId: query.batchId });
	if (query.country)
		and.push({ batch: { countryCode: query.country as CountryCode } });
	if (query.search) and.push(buildSearchWhere(query.search));

	const where: Prisma.InvoiceWhereInput = and.length ? { AND: and } : {};

	const [invoices, total] = await Promise.all([
		prisma.invoice.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				totalAmount: true,
				itemDetail: true,
				invoiceStatus: true,
				deadlinePayment: true,
				penaltyWaived: true,
				createdAt: true,
				buyer: {
					select: { id: true, name: true, email: true, idLine: true },
				},
				batch: {
					select: {
						id: true,
						title: true,
						countryCode: true,
						batchNumber: true,
					},
				},
				payments: {
					select: { amount: true, verificationStatus: true },
				},
			},
		}),
		prisma.invoice.count({ where }),
	]);

	const data = invoices.map((inv) => {
		const items = parseItemDetail(inv.itemDetail);
		const totalAmount = Number(inv.totalAmount);
		const { overdueDays, penaltyAmount } = computePenalty(
			inv,
			penaltyPerDay,
			now,
		);
		const totalPaid = inv.payments
			.filter((p) => p.verificationStatus === VerificationStatus.APPROVED)
			.reduce((s, p) => s + Number(p.amount), 0);
		const hasPendingProof = inv.payments.some(
			(p) => p.verificationStatus === VerificationStatus.PENDING,
		);

		return {
			id: inv.id,
			invoiceNumber: formatInvoiceNumber(inv.id),
			buyer: inv.buyer,
			batch: {
				...inv.batch,
				code: formatBatchCode(inv.batch.countryCode, inv.batch.batchNumber),
			},
			itemCount: items.length,
			totalPcs: items.reduce((s, i) => s + i.qty, 0),
			itemSummary: items
				.slice(0, 3)
				.map((i) => `${i.item_name} (${i.qty})`)
				.join(", "),
			totalAmount,
			penaltyAmount,
			overdueDays,
			penaltyWaived: inv.penaltyWaived,
			amountDue: totalAmount + penaltyAmount,
			totalPaid,
			remainingAmount: Math.max(totalAmount + penaltyAmount - totalPaid, 0),
			invoiceStatus: inv.invoiceStatus,
			effectiveStatus: resolveEffectiveStatus(
				inv.invoiceStatus,
				inv.deadlinePayment,
				now,
			),
			hasPendingProof,
			deadlinePayment: inv.deadlinePayment,
			createdAt: inv.createdAt,
		};
	});

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

// ==========================================
// 5. Detail
// ==========================================

export async function getInvoiceById(id: string) {
	const invoice = await prisma.invoice.findUnique({
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
				},
			},
			batch: {
				select: {
					id: true,
					title: true,
					countryCode: true,
					batchNumber: true,
					batchDate: true,
					status: true,
				},
			},
			payments: {
				orderBy: { createdAt: "desc" },
				include: {
					verifiedBy: { select: { id: true, name: true } },
				},
			},
		},
	});

	if (!invoice) {
		throw new AppError(404, "INVOICE_NOT_FOUND", "Invoice tidak ditemukan");
	}

	const now = new Date();
	const { penaltyPerDay } = await getInvoiceSettings();
	const { overdueDays, penaltyAmount } = computePenalty(
		invoice,
		penaltyPerDay,
		now,
	);
	const totalAmount = Number(invoice.totalAmount);
	const items = parseItemDetail(invoice.itemDetail).map((i) => ({
		...i,
		subtotal: i.harga_per_buyer * i.qty,
	}));
	const totalPaid = invoice.payments
		.filter((p) => p.verificationStatus === VerificationStatus.APPROVED)
		.reduce((s, p) => s + Number(p.amount), 0);

	const waivedBy = invoice.penaltyWaivedById
		? await prisma.user.findUnique({
				where: { id: invoice.penaltyWaivedById },
				select: { id: true, name: true },
			})
		: null;

	return {
		id: invoice.id,
		invoiceNumber: formatInvoiceNumber(invoice.id),
		buyer: invoice.buyer,
		batch: {
			...invoice.batch,
			code: formatBatchCode(
				invoice.batch.countryCode,
				invoice.batch.batchNumber,
			),
		},
		items,
		totalPcs: items.reduce((s, i) => s + i.qty, 0),
		totalAmount,
		penalty: {
			penaltyPerDay,
			overdueDays,
			penaltyAmount,
			waived: invoice.penaltyWaived,
			waivedReason: invoice.penaltyWaivedReason,
			waivedAt: invoice.penaltyWaivedAt,
			waivedBy,
		},
		amountDue: totalAmount + penaltyAmount,
		totalPaid,
		remainingAmount: Math.max(totalAmount + penaltyAmount - totalPaid, 0),
		invoiceStatus: invoice.invoiceStatus,
		effectiveStatus: resolveEffectiveStatus(
			invoice.invoiceStatus,
			invoice.deadlinePayment,
			now,
		),
		deadlinePayment: invoice.deadlinePayment,
		payments: invoice.payments.map((p) => ({
			id: p.id,
			amount: Number(p.amount),
			paymentMethod: p.paymentMethod,
			paymentDate: p.paymentDate,
			paymentProofUrl: p.paymentProofUrl,
			verificationStatus: p.verificationStatus,
			verifiedBy: p.verifiedBy,
			verifiedAt: p.verifiedAt,
			rejectReason: p.rejectReason,
			notes: p.notes,
			createdAt: p.createdAt,
		})),
		createdAt: invoice.createdAt,
		updatedAt: invoice.updatedAt,
	};
}

// ==========================================
// 6. Waive Penalty
// ==========================================

export async function waivePenalty(
	id: string,
	input: WaivePenaltyInput,
	adminUserId?: string,
) {
	const invoice = await prisma.invoice.findUnique({
		where: { id },
		select: {
			id: true,
			buyerId: true,
			invoiceStatus: true,
			deadlinePayment: true,
			penaltyWaived: true,
		},
	});

	if (!invoice) {
		throw new AppError(404, "INVOICE_NOT_FOUND", "Invoice tidak ditemukan");
	}
	if (invoice.invoiceStatus === InvoiceStatus.PAID) {
		throw AppError.conflict(
			"INVOICE_ALREADY_PAID",
			"Invoice sudah lunas, denda tidak dapat dibebaskan",
		);
	}
	if (invoice.penaltyWaived) {
		throw AppError.conflict(
			"CONFLICT",
			"Denda invoice ini sudah pernah dibebaskan",
		);
	}

	const { penaltyPerDay } = await getInvoiceSettings();
	const waivedAmount = calcPenalty(invoice.deadlinePayment, penaltyPerDay);

	await prisma.invoice.update({
		where: { id },
		data: {
			penaltyWaived: true,
			penaltyWaivedReason: input.reason,
			penaltyWaivedAt: new Date(),
			penaltyWaivedById: adminUserId ?? null,
			penaltyAmount: 0,
		},
	});

	const detail = await getInvoiceById(id);
	return { waivedAmount, invoice: detail };
}
