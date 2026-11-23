import { TrackingStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type ActivityType = "PAYMENT" | "TRACKING" | "BATCH" | "TAX";

export interface ActivityLogItem {
	id: string;
	type: ActivityType;
	title: string;
	actor: string;
	createdAt: Date;
}

const TRACKING_LABELS: Record<TrackingStatus, string> = {
	[TrackingStatus.PO]: "PO",
	[TrackingStatus.ON_SELLER_HAND]: "On Seller Hand",
	[TrackingStatus.ARRIVED_WH_LUAR]: "Tiba di WH Luar",
	[TrackingStatus.OTW_INA]: "OTW Indonesia",
	[TrackingStatus.ARRIVED_WH_INA]: "Tiba di WH Indonesia",
	[TrackingStatus.BISA_DI_CO]: "Bisa di-CO",
	[TrackingStatus.DONE]: "Selesai",
};

function formatBatchCode(countryCode: string, batchNumber: number) {
	return `${countryCode}-${String(batchNumber).padStart(3, "0")}`;
}

export async function getRecentActivities(
	limit = 10,
): Promise<ActivityLogItem[]> {
	const [payments, trackings, batches, taxInvoices] = await Promise.all([
		prisma.payment.findMany({
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				createdAt: true,
				buyer: { select: { name: true } },
				invoice: {
					select: {
						batch: { select: { countryCode: true, batchNumber: true } },
					},
				},
			},
		}),
		prisma.tracking.findMany({
			take: limit,
			orderBy: { updatedAt: "desc" },
			select: {
				id: true,
				currentStatus: true,
				updatedAt: true,
				batch: {
					select: {
						countryCode: true,
						batchNumber: true,
						adminNyelem: { select: { name: true } },
					},
				},
			},
		}),
		prisma.batch.findMany({
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				countryCode: true,
				batchNumber: true,
				createdAt: true,
				adminNyelem: { select: { name: true } },
			},
		}),
		prisma.taxInvoice.findMany({
			take: limit,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				createdAt: true,
				buyer: { select: { name: true } },
			},
		}),
	]);

	const activities: ActivityLogItem[] = [
		...payments.map((p) => {
			const batch = p.invoice?.batch;
			const batchCode = batch
				? ` (${formatBatchCode(batch.countryCode, batch.batchNumber)})`
				: "";
			return {
				id: `payment-${p.id}`,
				type: "PAYMENT" as const,
				title: "Bukti bayar diupload",
				actor: `${p.buyer.name}${batchCode}`,
				createdAt: p.createdAt,
			};
		}),
		...trackings.map((t) => {
			const statusLabel =
				TRACKING_LABELS[t.currentStatus] ?? String(t.currentStatus);
			const batchCode = formatBatchCode(
				t.batch.countryCode,
				t.batch.batchNumber,
			);
			return {
				id: `tracking-${t.id}`,
				type: "TRACKING" as const,
				title: `Status tracking diupdate: ${statusLabel}`,
				actor: t.batch.adminNyelem?.name ?? `Admin (${batchCode})`,
				createdAt: t.updatedAt,
			};
		}),
		...batches.map((b) => ({
			id: `batch-${b.id}`,
			type: "BATCH" as const,
			title: `Batch ${formatBatchCode(b.countryCode, b.batchNumber)} dibuat`,
			actor: b.adminNyelem?.name ?? "Admin",
			createdAt: b.createdAt,
		})),
		...taxInvoices.map((tax) => ({
			id: `tax-${tax.id}`,
			type: "TAX" as const,
			title: "Tagihan Tax dirilis",
			actor: tax.buyer.name,
			createdAt: tax.createdAt,
		})),
	];

	return activities
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.slice(0, limit);
}
