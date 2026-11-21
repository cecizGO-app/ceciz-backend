import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	PaymentMethod,
	PoCoStatus,
	PoOrderType,
	TrackingStatus,
} from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		poAlbum: {
			count: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		user: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getPoAlbumStats,
	getPoAlbums,
	createPoAlbums,
	getPoAlbumById,
	updatePoAlbum,
	deletePoAlbum,
} = await import("./po-albums.service.js");

function mockPoRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "po-1",
		buyerId: "buyer-1",
		batchNumber: "KR-ALB-07",
		itemName: "CATBBI Album Ver.",
		orderType: PoOrderType.PO_ALBUM,
		memberName: "Shotaro",
		qty: 1,
		totalQty: 2,
		harga: "305000",
		totalHarga: "305000",
		dpAmount: "205000",
		dpMethod: PaymentMethod.BCA,
		dpPaid: true,
		fpAmount: "100000",
		fpMethod: null,
		fpPaid: false,
		coStatus: PoCoStatus.CO_OPEN,
		trackingStatus: TrackingStatus.PO,
		notes: "titip sealed",
		createdAt: new Date(),
		updatedAt: new Date(),
		buyer: {
			id: "buyer-1",
			name: "Adeline",
			email: "adeline@test.com",
			idLine: "adelineptr",
		},
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getPoAlbumStats", () => {
	it("computes dashboard card metrics correctly", async () => {
		vi.mocked(prisma.poAlbum.count).mockResolvedValue(14);
		vi.mocked(prisma.poAlbum.findMany)
			.mockResolvedValueOnce([
				{ batchNumber: "KR-ALB-07" },
				{ batchNumber: "JP-015" },
			] as never)
			.mockResolvedValueOnce([{ buyerId: "b-1" }, { buyerId: "b-2" }] as never)
			.mockResolvedValueOnce([{ batchNumber: "KR-ALB-07" }] as never)
			.mockResolvedValueOnce([
				{
					dpAmount: "205000",
					dpPaid: true,
					fpAmount: "100000",
					fpPaid: true,
				},
				{
					dpAmount: "150000",
					dpPaid: true,
					fpAmount: "100000",
					fpPaid: false,
				},
			] as never);

		const stats = await getPoAlbumStats();

		expect(stats.totalOrders).toEqual({ count: 14, activeBatches: 2 });
		expect(stats.awaitingFp).toEqual({ buyerCount: 2 });
		expect(stats.coWebOpen).toEqual({ batchCount: 1 });
		expect(stats.collectedThisMonth).toEqual({ amount: 455000 });
	});
});

describe("getPoAlbums", () => {
	it("returns formatted list with paymentStatus and pagination meta", async () => {
		vi.mocked(prisma.poAlbum.findMany).mockResolvedValue([
			mockPoRow(),
		] as never);
		vi.mocked(prisma.poAlbum.count).mockResolvedValue(1);

		const result = await getPoAlbums({ page: 1, limit: 20 });

		expect(result.meta.total).toBe(1);
		expect(result.data[0]?.paymentStatus).toBe("AWAITING_FP");
		expect(result.data[0]?.total).toBe(305000);
	});
});

describe("createPoAlbums", () => {
	it("creates bulk rows and auto-creates unknown buyer", async () => {
		vi.mocked(prisma.user.findFirst)
			.mockResolvedValueOnce({ id: "buyer-1" } as never)
			.mockResolvedValueOnce(null);
		vi.mocked(prisma.user.create).mockResolvedValue({
			id: "buyer_newuser_123",
		} as never);
		vi.mocked(prisma.poAlbum.create)
			.mockResolvedValueOnce(mockPoRow() as never)
			.mockResolvedValueOnce(
				mockPoRow({
					id: "po-2",
					buyerId: "buyer_newuser_123",
					dpPaid: false,
				}) as never,
			);

		const result = await createPoAlbums({
			batchNumber: "KR-ALB-07",
			itemName: "CATBBI Album Ver.",
			orderType: PoOrderType.PO_ALBUM,
			coStatus: PoCoStatus.NOT_STARTED,
			trackingStatus: TrackingStatus.PO,
			items: [
				{
					buyerId: "@adelineptr",
					memberName: "Shotaro",
					qty: 1,
					harga: 305000,
					dpAmount: 205000,
					dpPaid: true,
					fpAmount: 100000,
					fpPaid: false,
				},
				{
					buyerId: "@newuser",
					memberName: "Shotaro",
					qty: 1,
					harga: 305000,
					dpAmount: 205000,
					dpPaid: false,
					fpAmount: 100000,
					fpPaid: false,
				},
			],
		});

		expect(result.count).toBe(2);
		expect(prisma.user.create).toHaveBeenCalledTimes(1);
		expect(prisma.poAlbum.create).toHaveBeenCalledTimes(2);
	});
});

describe("getPoAlbumById", () => {
	it("throws NOT_FOUND when missing", async () => {
		vi.mocked(prisma.poAlbum.findUnique).mockResolvedValue(null);
		await expect(getPoAlbumById("x")).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});
});

describe("updatePoAlbum", () => {
	it("updates FP status and recalculates totalHarga when qty changes", async () => {
		vi.mocked(prisma.poAlbum.findUnique).mockResolvedValue({
			id: "po-1",
			qty: 1,
			harga: "305000",
		} as never);
		vi.mocked(prisma.poAlbum.update).mockResolvedValue(
			mockPoRow({
				qty: 2,
				totalHarga: "610000",
				fpPaid: true,
				coStatus: PoCoStatus.COMPLETED,
			}) as never,
		);

		const updated = await updatePoAlbum("po-1", {
			qty: 2,
			fpPaid: true,
			coStatus: PoCoStatus.COMPLETED,
		});

		expect(prisma.poAlbum.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					qty: 2,
					totalHarga: 610000,
					fpPaid: true,
					coStatus: PoCoStatus.COMPLETED,
				}),
			}),
		);
		expect(updated.paymentStatus).toBe("PAID");
		expect(updated.coStatus).toBe(PoCoStatus.COMPLETED);
	});
});

describe("deletePoAlbum", () => {
	it("deletes existing record", async () => {
		vi.mocked(prisma.poAlbum.findUnique).mockResolvedValue({
			id: "po-1",
		} as never);
		vi.mocked(prisma.poAlbum.delete).mockResolvedValue({ id: "po-1" } as never);

		const res = await deletePoAlbum("po-1");
		expect(res).toEqual({ id: "po-1", deleted: true });
	});
});
