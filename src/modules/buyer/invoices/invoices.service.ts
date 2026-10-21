import { CountryCode } from "../../../generated/prisma/enums.js";
import { buildMeta, getPaginationArgs } from "../../../lib/pagination.js";
import { prisma } from "../../../lib/prisma.js";
import { calcPenalty } from "../../../services/penalty.service.js";
import type { GetInvoicesQuery } from "./invoices.schema.js";

async function getPenaltyPerDay(): Promise<number> {
	const settings = await prisma.setting.findUnique({
		where: { id: "singleton" },
		select: { penaltyPerDay: true },
	});
	return Number(settings?.penaltyPerDay ?? 2000);
}

export async function getInvoices(buyerId: string, query: GetInvoicesQuery) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		buyerId,
		...(query.status && { invoiceStatus: query.status }),
		...(query.batch_id && { batchId: query.batch_id }),
	};

	const [invoices, total] = await Promise.all([
		prisma.invoice.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				batchId: true,
				totalAmount: true,
				invoiceStatus: true,
				deadlinePayment: true,
				createdAt: true,
				batch: {
					select: {
						id: true,
						title: true,
						countryCode: true,
						batchNumber: true,
					},
				},
			},
		}),
		prisma.invoice.count({ where }),
	]);

	const penaltyPerDay = await getPenaltyPerDay();
	const now = new Date();

	const data = invoices.map((inv) => {
		const isPaid = inv.invoiceStatus === "PAID";
		const penaltyAmount = isPaid
			? 0
			: calcPenalty(inv.deadlinePayment, penaltyPerDay, false, now);
		const totalAmount = Number(inv.totalAmount);

		return {
			id: inv.id,
			batch_id: inv.batchId,
			batch: inv.batch,
			total_amount: totalAmount,
			invoice_status: inv.invoiceStatus,
			deadline_payment: inv.deadlinePayment,
			penalty_amount: penaltyAmount,
			amount_due: totalAmount + penaltyAmount,
			created_at: inv.createdAt,
		};
	});

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getInvoiceById(buyerId: string, invoiceId: string) {
	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, buyerId },
		include: {
			batch: {
				select: {
					id: true,
					title: true,
					countryCode: true,
					batchNumber: true,
					batchDate: true,
				},
			},
			payments: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					paymentDate: true,
					verificationStatus: true,
					rejectReason: true,
					createdAt: true,
				},
			},
		},
	});

	if (!invoice) return null;

	// JP gating: if JP and harga_jual is null, return limited info
	const isJp = invoice.batch.countryCode === CountryCode.JP;
	if (isJp && Number(invoice.totalAmount) === 0) {
		return {
			available: false,
			message: "Menunggu konfirmasi harga dari admin",
		};
	}

	const penaltyPerDay = await getPenaltyPerDay();
	const now = new Date();
	const isPaid = invoice.invoiceStatus === "PAID";
	const penaltyAmount = isPaid
		? 0
		: calcPenalty(invoice.deadlinePayment, penaltyPerDay, false, now);
	const totalAmount = Number(invoice.totalAmount);
	const latestPayment = invoice.payments[0] ?? null;

	return {
		available: true,
		id: invoice.id,
		batch_id: invoice.batchId,
		batch: invoice.batch,
		total_amount: totalAmount,
		item_detail: invoice.itemDetail,
		invoice_status: invoice.invoiceStatus,
		deadline_payment: invoice.deadlinePayment,
		penalty_amount: penaltyAmount,
		amount_due: totalAmount + penaltyAmount,
		latest_payment_status: latestPayment?.verificationStatus ?? null,
		reject_reason: latestPayment?.rejectReason ?? null,
		payments: invoice.payments.map((p) => ({
			...p,
			amount: Number(p.amount),
		})),
		created_at: invoice.createdAt,
	};
}
