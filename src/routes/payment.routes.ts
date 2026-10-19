import { Router } from "express";
import {
	bulkVerifyPayments,
	createPayment,
	getPaymentById,
	getPaymentStats,
	getPayments,
	uploadPaymentProof,
	verifyPayment,
} from "@/controllers/payment.controller";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { uploadImage } from "@/middleware/upload";

export const router: Router = Router();

// 1. Upload file image to Cloudflare R2
router.post(
	"/api/v1/upload",
	requireAuth,
	uploadImage.single("file"),
	uploadPaymentProof,
);

// 2. Summary stats for the 4 top cards
router.get(
	"/api/v1/admin/payments/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getPaymentStats,
);

// 3. Bulk verify payments
router.post(
	"/api/v1/admin/payments/bulk-verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	bulkVerifyPayments,
);

// 4. Create manual payment (Button "+ Tambah Pembayaran")
router.post(
	"/api/v1/admin/payments",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	createPayment,
);

// 5. Get payments list with tabs, filters, search & pagination
router.get(
	"/api/v1/admin/payments",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getPayments,
);

// 6. Get payment detail by ID (Lihat Bukti)
router.get(
	"/api/v1/admin/payments/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	getPaymentById,
);

// 7. Verify single payment (Approve or Reject with reason)
router.patch(
	"/api/v1/admin/payments/:id/verify",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	verifyPayment,
);

export default router;
