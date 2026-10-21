import {
	CountryCode,
	InvoiceStatus,
	NotificationChannel,
	NotificationType,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { CreateOrderInput, GetOrdersQuery } from "./orders.schema.js";

export async function createOrder(buyerId: string, input: CreateOrderInput) {
	return prisma.$transaction(async (tx) => {
		// 1. Validate batch
		const batch = await tx.batch.findUnique({
			where: { id: input.batch_id },
			include: {
				items: {
					where: { buyerId },
					select: {
						id: true,
						description: true,
						pcs: true,
						hargaPerBuyer: true,
						hargaJualPerBuyer: true,
					},
				},
			},
		});

		if (!batch) throw AppError.notFound("Batch tidak ditemukan");
		if (batch.status !== "OPEN")
			throw AppError.conflict("BATCH_CLOSED", "Batch sudah ditutup");

		// 2. Get settings for deadline
		const settings = await tx.setting.findUnique({
			where: { id: "singleton" },
			select: { deadlineBatchHours: true, penaltyPerDay: true },
		});
		const deadlineHours = settings?.deadlineBatchHours ?? 24;

		const isJp = batch.countryCode === CountryCode.JP;

		// 3. Find buyer's items in this batch to calculate total
		const buyerItems = batch.items;
		if (buyerItems.length === 0) {
			throw AppError.badRequest(
				"Tidak ada item untukmu di batch ini. Hubungi admin untuk menambahkan item.",
			);
		}

		// 4. Calculate total amount
		let totalAmount: number | null = null;
		let invoiceStatus: InvoiceStatus = InvoiceStatus.UNPAID;

		if (isJp) {
			const hasPrice = buyerItems.some((i) => i.hargaJualPerBuyer !== null);
			if (!hasPrice) {
				invoiceStatus = InvoiceStatus.UNPAID; // will be treated as awaiting_price
				totalAmount = null;
			} else {
				totalAmount = buyerItems.reduce(
					(sum, item) => sum + Number(item.hargaJualPerBuyer ?? 0) * item.pcs,
					0,
				);
			}
		} else {
			totalAmount = buyerItems.reduce(
				(sum, item) => sum + Number(item.hargaPerBuyer ?? 0) * item.pcs,
				0,
			);
		}

		// 5. Build itemDetail JSON
		const itemDetail = buyerItems.map((item) => ({
			item_name: item.description,
			qty: item.pcs,
			harga_per_buyer: isJp
				? Number(item.hargaJualPerBuyer ?? 0)
				: Number(item.hargaPerBuyer ?? 0),
		}));

		// 6. Upsert order
		const existingOrder = await tx.order.findFirst({
			where: { batchId: input.batch_id, buyerId },
		});

		const order = existingOrder
			? await tx.order.update({
					where: { id: existingOrder.id },
					data: { itemQty: input.item_qty },
				})
			: await tx.order.create({
					data: {
						batchId: input.batch_id,
						buyerId,
						itemQty: input.item_qty,
					},
				});

		// 7. 1 invoice per buyer per batch: upsert
		const existingInvoice = await tx.invoice.findFirst({
			where: { batchId: input.batch_id, buyerId },
			include: {
				payments: {
					where: { verificationStatus: "APPROVED" },
					select: { id: true },
				},
			},
		});

		const deadlinePayment = new Date(
			Date.now() + deadlineHours * 60 * 60 * 1000,
		);

		if (existingInvoice && existingInvoice.payments.length > 0) {
			throw AppError.conflict(
				"INVOICE_ALREADY_PAID",
				"Pembayaran invoice sudah disetujui. Tidak dapat mengubah order.",
			);
		}

		const invoice = existingInvoice
			? await tx.invoice.update({
					where: { id: existingInvoice.id },
					data: {
						itemDetail,
						...(totalAmount !== null && { totalAmount }),
						invoiceStatus,
					},
				})
			: await tx.invoice.create({
					data: {
						buyerId,
						batchId: input.batch_id,
						totalAmount: totalAmount ?? 0,
						itemDetail,
						invoiceStatus,
						deadlinePayment,
					},
				});

		// Notify if not awaiting price
		if (!(isJp && totalAmount === null)) {
			await tx.notification.create({
				data: {
					buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.INVOICE_NEW,
					title: "Invoice Baru",
					body: `Tagihan batch ${batch.title} sebesar Rp ${totalAmount?.toLocaleString("id-ID") ?? "-"} telah dibuat.`,
					triggeredByEvent: "ORDER_CREATED",
					referenceId: invoice.id,
				},
			});
		}

		return { order, invoice };
	});
}

export async function getOrders(buyerId: string, query: GetOrdersQuery) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		buyerId,
		...(query.status && { orderStatus: query.status }),
	};

	const [orders, total] = await Promise.all([
		prisma.order.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			include: {
				batch: {
					select: {
						id: true,
						title: true,
						countryCode: true,
						batchNumber: true,
						status: true,
					},
				},
				invoices: false,
			},
		}),
		prisma.order.count({ where }),
	]);

	// Attach related invoice summary
	const orderIds = orders.map((o) => o.batchId);

	if (orders.length === 0) {
		return { data: [], meta: buildMeta(total, query.page, query.limit) };
	}

	const invoices = await prisma.invoice.findMany({
		where: { buyerId, batchId: { in: orderIds } },
		select: {
			id: true,
			batchId: true,
			totalAmount: true,
			invoiceStatus: true,
			deadlinePayment: true,
		},
	});

	const invoiceByBatch = Object.fromEntries(
		invoices.map((inv) => [inv.batchId, inv]),
	);

	const data = orders.map((order) => ({
		id: order.id,
		batch_id: order.batchId,
		batch: order.batch,
		item_qty: order.itemQty,
		order_status: order.orderStatus,
		created_at: order.createdAt,
		invoice_summary: invoiceByBatch[order.batchId] ?? null,
	}));

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getOrderById(buyerId: string, orderId: string) {
	const order = await prisma.order.findFirst({
		where: { id: orderId, buyerId },
		include: {
			batch: {
				select: {
					id: true,
					title: true,
					countryCode: true,
					batchNumber: true,
					status: true,
					batchDate: true,
				},
			},
		},
	});

	if (!order) return null;

	const invoice = await prisma.invoice.findFirst({
		where: { batchId: order.batchId, buyerId },
		select: {
			id: true,
			totalAmount: true,
			invoiceStatus: true,
			deadlinePayment: true,
			itemDetail: true,
		},
	});

	return {
		id: order.id,
		batch: order.batch,
		item_qty: order.itemQty,
		order_status: order.orderStatus,
		created_at: order.createdAt,
		invoice_summary: invoice
			? {
					...invoice,
					total_amount: Number(invoice.totalAmount),
				}
			: null,
	};
}
