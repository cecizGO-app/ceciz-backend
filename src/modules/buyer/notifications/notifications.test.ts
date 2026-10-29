/**
 * Unit tests for notifications service (pure logic).
 * The service functions are tested with mocked prisma.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing the service
vi.mock("@/lib/prisma", () => ({
	prisma: {
		notification: {
			findMany: vi.fn(),
			count: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}));

const { prisma } = await import("@/lib/prisma");
const { getNotifications, getUnreadCount, markAsRead, markAllAsRead } =
	await import("./notifications.service.js");

const buyerId = "buyer-1";

const mockNotif = {
	id: "notif-1",
	channel: "IN_APP",
	type: "INVOICE_NEW",
	title: "Invoice Baru",
	body: "Invoice #1 telah dibuat",
	triggeredByEvent: "invoice.created",
	referenceId: "inv-1",
	isRead: false,
	createdAt: new Date("2024-01-01"),
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getNotifications", () => {
	it("returns paginated notifications without filter", async () => {
		vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotif] as never);
		vi.mocked(prisma.notification.count).mockResolvedValue(1);

		const result = await getNotifications(buyerId, { page: 1, limit: 20 });

		expect(result.data).toHaveLength(1);
		expect(result.data[0]).toMatchObject({ id: "notif-1", is_read: false });
		expect(result.meta.total).toBe(1);
	});

	it("filters by is_read=true", async () => {
		vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
		vi.mocked(prisma.notification.count).mockResolvedValue(0);

		await getNotifications(buyerId, { page: 1, limit: 20, is_read: "true" });

		const whereArg = vi.mocked(prisma.notification.findMany).mock.calls[0]?.[0]?.where;
		expect(whereArg).toMatchObject({ buyerId, isRead: true });
	});

	it("filters by is_read=false", async () => {
		vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotif] as never);
		vi.mocked(prisma.notification.count).mockResolvedValue(1);

		await getNotifications(buyerId, { page: 1, limit: 20, is_read: "false" });

		const whereArg = vi.mocked(prisma.notification.findMany).mock.calls[0]?.[0]?.where;
		expect(whereArg).toMatchObject({ buyerId, isRead: false });
	});
});

describe("getUnreadCount", () => {
	it("returns unread count", async () => {
		vi.mocked(prisma.notification.count).mockResolvedValue(5);

		const result = await getUnreadCount(buyerId);
		expect(result.unread_count).toBe(5);
	});
});

describe("markAsRead", () => {
	it("throws NOT_FOUND when notification does not belong to buyer", async () => {
		vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);

		await expect(markAsRead(buyerId, "bad-id")).rejects.toMatchObject({
			statusCode: 404,
			code: "NOTIFICATION_NOT_FOUND",
		});
	});

	it("marks notification as read when found", async () => {
		vi.mocked(prisma.notification.findFirst).mockResolvedValue(mockNotif as never);
		vi.mocked(prisma.notification.update).mockResolvedValue({
			id: "notif-1",
			isRead: true,
		} as never);

		const result = await markAsRead(buyerId, "notif-1");
		// Service returns raw prisma shape: { id, isRead }
		expect(result).toMatchObject({ id: "notif-1", isRead: true });
	});
});

describe("markAllAsRead", () => {
	it("calls updateMany with correct where clause", async () => {
		vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 } as never);

		const result = await markAllAsRead(buyerId);
		expect(result).toMatchObject({ updated: 3 });

		const whereArg = vi.mocked(prisma.notification.updateMany).mock.calls[0]?.[0]?.where;
		expect(whereArg).toMatchObject({ buyerId, isRead: false });
	});
});
