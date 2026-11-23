import { beforeEach, describe, expect, it, vi } from "vitest";
import { TrackingStatus } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		payment: { findMany: vi.fn() },
		tracking: { findMany: vi.fn() },
		batch: { findMany: vi.fn() },
		taxInvoice: { findMany: vi.fn() },
	},
}));

const { prisma } = await import("@/lib/prisma");
const { getRecentActivities } = await import("./dashboard.service.js");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Admin Dashboard Service - Recent Activities", () => {
	it("merges and sorts recent activities from payment, tracking, batch, and tax", async () => {
		const t1 = new Date("2026-11-23T10:52:00Z"); // 8m ago
		const t2 = new Date("2026-11-23T10:36:00Z"); // 24m ago
		const t3 = new Date("2026-11-23T10:00:00Z"); // 1h ago
		const t4 = new Date("2026-11-23T08:00:00Z"); // 3h ago

		vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([
			{
				id: "pay-1",
				createdAt: t1,
				buyer: { name: "Maya Putri" },
				invoice: { batch: { countryCode: "CH", batchNumber: 25 } },
			},
		] as never);

		vi.mocked(prisma.tracking.findMany).mockResolvedValueOnce([
			{
				id: "trk-1",
				currentStatus: TrackingStatus.OTW_INA,
				updatedAt: t2,
				batch: {
					countryCode: "CH",
					batchNumber: 25,
					adminNyelem: { name: "Salsa" },
				},
			},
		] as never);

		vi.mocked(prisma.batch.findMany).mockResolvedValueOnce([
			{
				id: "bat-1",
				countryCode: "JP",
				batchNumber: 14,
				createdAt: t3,
				adminNyelem: { name: "Nadia" },
			},
		] as never);

		vi.mocked(prisma.taxInvoice.findMany).mockResolvedValueOnce([
			{
				id: "tax-1",
				createdAt: t4,
				buyer: { name: "Aurel" },
			},
		] as never);

		const activities = await getRecentActivities(10);

		expect(activities).toHaveLength(4);
		expect(activities[0]).toEqual({
			id: "payment-pay-1",
			type: "PAYMENT",
			title: "Bukti bayar diupload",
			actor: "Maya Putri (CH-025)",
			createdAt: t1,
		});
		expect(activities[1]).toEqual({
			id: "tracking-trk-1",
			type: "TRACKING",
			title: "Status tracking diupdate: OTW Indonesia",
			actor: "Salsa",
			createdAt: t2,
		});
		expect(activities[2]).toEqual({
			id: "batch-bat-1",
			type: "BATCH",
			title: "Batch JP-014 dibuat",
			actor: "Nadia",
			createdAt: t3,
		});
		expect(activities[3]).toEqual({
			id: "tax-tax-1",
			type: "TAX",
			title: "Tagihan Tax dirilis",
			actor: "Aurel",
			createdAt: t4,
		});
	});

	it("respects the limit parameter", async () => {
		vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([
			{
				id: "pay-1",
				createdAt: new Date("2026-11-23T10:52:00Z"),
				buyer: { name: "Maya Putri" },
				invoice: null,
			},
			{
				id: "pay-2",
				createdAt: new Date("2026-11-23T10:40:00Z"),
				buyer: { name: "Naya" },
				invoice: null,
			},
		] as never);
		vi.mocked(prisma.tracking.findMany).mockResolvedValueOnce([]);
		vi.mocked(prisma.batch.findMany).mockResolvedValueOnce([]);
		vi.mocked(prisma.taxInvoice.findMany).mockResolvedValueOnce([]);

		const activities = await getRecentActivities(1);
		expect(activities).toHaveLength(1);
		expect(activities[0]?.id).toBe("payment-pay-1");
	});
});
