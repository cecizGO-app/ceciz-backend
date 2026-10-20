import { VerificationStatus } from "../../../generated/prisma/enums.js";
import { AppError } from "../../../lib/errors.js";
import { buildMeta, getPaginationArgs } from "../../../lib/pagination.js";
import { prisma } from "../../../lib/prisma.js";
import { uploadToR2 } from "../../../lib/r2.js";
import { calcPenalty } from "../../../services/penalty.service.js";
import { validateImageMime } from "../payments/upload.middleware.js";
import type {
	GetTaxInvoicesQuery,
	UploadTaxPaymentInput,
} from "./tax.schema.js";

const MAX_STORAGE_DAYS = 60;

async function getPenaltyPerDay(): Promise<number> {
	const settings = await prisma.setting.findUnique({
		where: { id: "singleton" },
		select: { penaltyPerDay: true, maxStorageDays: true },
	});
	return Number(settings?.penaltyPerDay ?? 2000);
}

export async function getTaxInvoices(
	buyerId: string,
	query: GetTaxInvoicesQuery,
) {
	const { skip, take } = getPaginationArgs(query);

	const where = {
		buyerId,
		...(query.status && { status: query.status }),
	};

	const [taxInvoices, total] = await Promise.all([
		prisma.taxInvoice.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				releaseName: true,
				releasePeriod: true,
				taxInvoiceTotal: true,
				deadlinePayment: true,
				maxCheckoutDate: true,
				status: true,
				createdAt: true,
			},
		}),
		prisma.taxInvoice.count({ where }),
	]);

	const penaltyPerDay = await getPenaltyPerDay();
	const now = new Date();

	const data = taxInvoices.map((inv) => {
		const penaltyAmount = calcPenalty(
			inv.deadlinePayment,
			penaltyPerDay,
			false,
			now,
		);
		const daysSinceRelease = Math.floor(
			(now.getTime() - inv.createdAt.getTime()) / (1000 * 60 * 60 * 24),
		);

		return {
			id: inv.id,
			release_name: inv.releaseName,
			release_period: inv.releasePeriod,
			tax_invoice_total: Number(inv.taxInvoiceTotal),
			deadline_payment: inv.deadlinePayment,
			max_checkout_date: inv.maxCheckoutDate,
			status: inv.status,
			penalty_amount: penaltyAmount,
			show_checkout_reminder: daysSinceRelease >= MAX_STORAGE_DAYS,
		};
	});

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getTaxInvoiceById(buyerId: string, taxInvoiceId: string) {
	const taxInvoice = await prisma.taxInvoice.findFirst({
		where: { id: taxInvoiceId, buyerId },
		include: {
			payments: {
				orderBy: { createdAt: "desc" },
				select: {
					id: true,
					amount: true,
					paymentMethod: true,
					taxVerificationStatus: true,
					createdAt: true,
				},
			},
		},
	});

	if (!taxInvoice) return null;

	const penaltyPerDay = await getPenaltyPerDay();
	const now = new Date();
	const penaltyAmount = calcPenalty(
		taxInvoice.deadlinePayment,
		penaltyPerDay,
		false,
		now,
	);
	const daysSinceRelease = Math.floor(
		(now.getTime() - taxInvoice.createdAt.getTime()) / (1000 * 60 * 60 * 24),
	);

	return {
		id: taxInvoice.id,
		release_name: taxInvoice.releaseName,
		release_period: taxInvoice.releasePeriod,
		tax_invoice_total: Number(taxInvoice.taxInvoiceTotal),
		breakdown_detail: taxInvoice.breakdownDetail,
		deadline_payment: taxInvoice.deadlinePayment,
		max_checkout_date: taxInvoice.maxCheckoutDate,
		status: taxInvoice.status,
		penalty_amount: penaltyAmount,
		amount_due: Number(taxInvoice.taxInvoiceTotal) + penaltyAmount,
		show_checkout_reminder: daysSinceRelease >= MAX_STORAGE_DAYS,
		payments: taxInvoice.payments.map((p) => ({
			...p,
			amount: Number(p.amount),
		})),
	};
}

export async function uploadTaxPayment(
	buyerId: string,
	taxInvoiceId: string,
	file: Express.Multer.File,
	input: UploadTaxPaymentInput,
) {
	const taxInvoice = await prisma.taxInvoice.findFirst({
		where: { id: taxInvoiceId, buyerId },
		include: {
			payments: {
				where: {
					taxVerificationStatus: {
						in: [VerificationStatus.PENDING, VerificationStatus.APPROVED],
					},
				},
				select: { id: true },
			},
		},
	});

	if (!taxInvoice) throw AppError.notFound("Tagihan tax tidak ditemukan");

	if (taxInvoice.payments.length > 0) {
		throw AppError.conflict(
			"TAX_PAYMENT_ALREADY_PENDING",
			"Sudah ada pembayaran tax yang menunggu verifikasi atau sudah disetujui.",
		);
	}

	// Payment date cannot be in the future
	if (input.payment_date > new Date()) {
		throw AppError.badRequest("Tanggal pembayaran tidak boleh di masa depan");
	}

	validateImageMime(file);

	const ext = file.originalname.split(".").pop() ?? "jpg";
	const key = `tax-payments/${buyerId}/${taxInvoiceId}/${Date.now()}.${ext}`;
	const url = await uploadToR2(file.buffer, key, file.mimetype);

	return prisma.taxPayment.create({
		data: {
			taxInvoiceId,
			buyerId,
			taxPaymentProofUrl: url,
			amount: input.amount,
			paymentMethod: input.payment_method as never,
			paymentDate: input.payment_date,
			taxVerificationStatus: VerificationStatus.PENDING,
		},
	});
}

export async function getTaxPayments(buyerId: string, taxInvoiceId: string) {
	const taxInvoice = await prisma.taxInvoice.findFirst({
		where: { id: taxInvoiceId, buyerId },
		select: { id: true },
	});
	if (!taxInvoice) throw AppError.notFound("Tagihan tax tidak ditemukan");

	const payments = await prisma.taxPayment.findMany({
		where: { taxInvoiceId, buyerId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			amount: true,
			paymentMethod: true,
			paymentDate: true,
			taxVerificationStatus: true,
			taxPaymentProofUrl: true,
			createdAt: true,
		},
	});

	return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
}
