import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { sendSuccess } from "../../lib/response.js";

export const contentRouter = Router();

/**
 * GET /api/v1/content/cs-contact
 * Returns CS contact info from Settings (no auth required).
 */
contentRouter.get("/api/v1/content/cs-contact", async (_req, res) => {
	const settings = await prisma.setting.findUnique({
		where: { id: "singleton" },
		select: { csContact: true },
	});

	return sendSuccess(res, {
		csContact:
			settings?.csContact ??
			process.env.CS_CONTACT_FALLBACK ??
			"Hubungi admin melalui WhatsApp",
	});
});

/**
 * GET /api/v1/content/faq
 * Returns static FAQ content.
 */
contentRouter.get("/api/v1/content/faq", (_req, res) => {
	const faqs = [
		{
			id: 1,
			question: "Bagaimana cara melakukan order?",
			answer:
				"Pilih batch yang tersedia, klik 'Order', masukkan jumlah item, lalu konfirmasi. Invoice akan otomatis terbentuk.",
		},
		{
			id: 2,
			question: "Bagaimana cara membayar?",
			answer:
				"Buka halaman Invoice, klik 'Upload Bukti Bayar', lalu unggah foto bukti transfer. Tersedia metode: BCA, QRIS, SeaBank, ShopeePay.",
		},
		{
			id: 3,
			question: "Apa itu denda keterlambatan?",
			answer:
				"Jika pembayaran melebihi batas waktu yang ditentukan, akan dikenakan denda per hari. Besaran denda dapat dilihat di detail invoice.",
		},
		{
			id: 4,
			question: "Bagaimana alur tracking barang?",
			answer:
				"Barang mengikuti tahapan: PO → On Seller Hand → Arrived WH Luar → OTW INA → Arrived WH INA → Bisa di CO → Done. Status dapat dipantau di halaman Tracking.",
		},
		{
			id: 5,
			question: "Apa itu Tagihan Tax?",
			answer:
				"Tagihan Tax adalah biaya pajak yang dihitung periodik per batch. Akan muncul setelah admin merilis tagihan tax untuk batch-batch yang kamu ikuti.",
		},
		{
			id: 6,
			question: "Kapan barang bisa di-checkout (CO)?",
			answer:
				"Barang bisa di-checkout setelah status tracking menjadi 'Bisa di CO'. Checkout dilakukan melalui Shopee sesuai panduan admin. Batas penyimpanan adalah 60 hari sejak tagihan tax terbit.",
		},
	];

	return sendSuccess(res, { faqs });
});
