import { InvoiceStatus, VerificationStatus } from "@/generated/prisma/enums";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { GetHistoryQuery } from "./history.schema.js";

export async function getBatchHistory(buyerId: string, query: GetHistoryQuery) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		buyerId,
		invoiceStatus: InvoiceStatus.PAID,
	};

	const [invoices, total] = await Promise.all([
		prisma.invoice.findMany({
			where,
			skip,
			take,
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				batchId: true,
				totalAmount: true,
				invoiceStatus: true,
				deadlinePayment: true,
				createdAt: true,
				updatedAt: true,
				batch: {
					select: {
						id: true,
						title: true,
						batchNumber: true,
						countryCode: true,
						batchDate: true,
						status: true,
					},
				},
			},
		}),
		prisma.invoice.count({ where }),
	]);

	const data = invoices.map((inv) => ({
		id: inv.id,
		batch_id: inv.batchId,
		total_amount: Number(inv.totalAmount),
		invoice_status: inv.invoiceStatus,
		deadline_payment: inv.deadlinePayment,
		batch: inv.batch,
		created_at: inv.createdAt,
		updated_at: inv.updatedAt,
	}));

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getPaymentHistory(
	buyerId: string,
	query: GetHistoryQuery,
) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		buyerId,
		verificationStatus: VerificationStatus.APPROVED,
	};

	const [payments, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			skip,
			take,
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				invoiceId: true,
				amount: true,
				paymentMethod: true,
				paymentDate: true,
				verificationStatus: true,
				verifiedAt: true,
				notes: true,
				createdAt: true,
				updatedAt: true,
				invoice: {
					select: {
						id: true,
						invoiceStatus: true,
						batch: {
							select: {
								id: true,
								title: true,
								batchNumber: true,
								countryCode: true,
							},
						},
					},
				},
			},
		}),
		prisma.payment.count({ where }),
	]);

	const data = payments.map((p) => ({
		id: p.id,
		invoice_id: p.invoiceId,
		amount: Number(p.amount),
		payment_method: p.paymentMethod,
		payment_date: p.paymentDate,
		verification_status: p.verificationStatus,
		verified_at: p.verifiedAt,
		notes: p.notes,
		invoice: p.invoice,
		created_at: p.createdAt,
		updated_at: p.updatedAt,
	}));

	return { data, meta: buildMeta(total, query.page, query.limit) };
}
