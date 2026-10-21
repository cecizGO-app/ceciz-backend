import { CountryCode, VerificationStatus } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { uploadToR2 } from "@/lib/r2";
import type { UploadPaymentInput } from "./payments.schema.js";
import { validateImageMime } from "./upload.middleware.js";

export async function uploadBatchPayment(
	buyerId: string,
	invoiceId: string,
	file: Express.Multer.File,
	input: UploadPaymentInput,
) {
	// 1. Ownership check
	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, buyerId },
		include: {
			batch: { select: { countryCode: true } },
			payments: {
				where: {
					verificationStatus: {
						in: [VerificationStatus.PENDING, VerificationStatus.APPROVED],
					},
				},
				select: { id: true, verificationStatus: true },
			},
		},
	});

	if (!invoice) throw AppError.notFound("Invoice tidak ditemukan");

	// JP gating
	if (
		invoice.batch.countryCode === CountryCode.JP &&
		Number(invoice.totalAmount) === 0
	) {
		throw AppError.conflict(
			"INVOICE_NOT_AVAILABLE",
			"Menunggu konfirmasi harga dari admin",
		);
	}

	// 2. Validate no pending/approved payment
	const hasBlocker = invoice.payments.some(
		(p) =>
			p.verificationStatus === VerificationStatus.PENDING ||
			p.verificationStatus === VerificationStatus.APPROVED,
	);
	if (hasBlocker) {
		throw AppError.conflict(
			"PAYMENT_ALREADY_PENDING",
			"Sudah ada pembayaran yang menunggu verifikasi atau sudah disetujui.",
		);
	}

	// 3. Payment date cannot be in the future
	const now = new Date();
	if (input.payment_date > now) {
		throw AppError.badRequest("Tanggal pembayaran tidak boleh di masa depan");
	}

	// 4. Validate magic bytes
	validateImageMime(file);

	// 5. Upload to R2
	const ext = file.originalname.split(".").pop() ?? "jpg";
	const key = `payments/${buyerId}/${invoiceId}/${Date.now()}.${ext}`;
	const url = await uploadToR2(file.buffer, key, file.mimetype);

	// 6. Create payment record
	const payment = await prisma.payment.create({
		data: {
			invoiceId,
			buyerId,
			paymentProofUrl: url,
			amount: input.amount,
			paymentMethod: input.payment_method as never,
			paymentDate: input.payment_date,
			verificationStatus: VerificationStatus.PENDING,
		},
	});

	// 7. Update invoice status to awaiting verification
	await prisma.invoice.update({
		where: { id: invoiceId },
		data: { invoiceStatus: "AWAITING_VERIFICATION" },
	});

	return payment;
}

export async function getBatchPayments(buyerId: string, invoiceId: string) {
	// Ownership check
	const invoice = await prisma.invoice.findFirst({
		where: { id: invoiceId, buyerId },
		select: { id: true },
	});
	if (!invoice) throw AppError.notFound("Invoice tidak ditemukan");

	const payments = await prisma.payment.findMany({
		where: { invoiceId, buyerId },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			amount: true,
			paymentMethod: true,
			paymentDate: true,
			verificationStatus: true,
			rejectReason: true,
			paymentProofUrl: true,
			createdAt: true,
		},
	});

	return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
}
