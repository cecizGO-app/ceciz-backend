import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	CountryCode,
	InvoiceStatus,
	VerificationStatus,
} from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		invoice: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
			aggregate: vi.fn(),
		},
		payment: {
			count: vi.fn(),
			aggregate: vi.fn(),
		},
		batch: { findUnique: vi.fn() },
		order: {
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		user: { findUnique: vi.fn() },
		setting: { findUnique: vi.fn() },
		notification: { create: vi.fn() },
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getInvoicePreview,
	generateInvoices,
	getInvoices,
	getInvoiceById,
	waivePenalty,
	resolveEffectiveStatus,
} = await import("./invoices.service.js");

const DAY = 24 * 60 * 60 * 1000;

function mockBatch(overrides: Record<string, unknown> = {}) {
	return {
		id: "batch-1",
		title: "Batch CH 15",
		countryCode: CountryCode.CH,
		batchNumber: 15,
		status: "OPEN",
		feeGo: "10000",
		feeRekap: "4000",
		items: [
			{
				buyerId: "buyer-a",
				description: "Photocard A",
				pcs: 2,
				hargaPerBuyer: "50000",
				hargaJualPerBuyer: null,
				buyer: { id: "buyer-a", name: "Maya", idLine: "maya" },
			},
			{
				buyerId: "buyer-a",
				description: "Album B",
				pcs: 1,
				hargaPerBuyer: "120000",
				hargaJualPerBuyer: null,
				buyer: { id: "buyer-a", name: "Maya", idLine: "maya" },
			},
			{
				buyerId: "buyer-b",
				description: "Photocard C",
				pcs: 1,
				hargaPerBuyer: "45000",
				hargaJualPerBuyer: null,
				buyer: { id: "buyer-b", name: "Rania", idLine: null },
			},
		],
		invoices: [],
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(prisma.setting.findUnique).mockResolvedValue({
		penaltyPerDay: "2000",
		deadlineBatchHours: 24,
	} as never);
});

describe("resolveEffectiveStatus", () => {
	it("marks UNPAID past deadline as OVERDUE", () => {
		const now = new Date();
		expect(
			resolveEffectiveStatus(
				InvoiceStatus.UNPAID,
				new Date(now.getTime() - DAY),
				now,
			),
		).toBe(InvoiceStatus.OVERDUE);
	});

	it("keeps UNPAID before deadline", () => {
		const now = new Date();
		expect(
			resolveEffectiveStatus(
				InvoiceStatus.UNPAID,
				new Date(now.getTime() + DAY),
				now,
			),
		).toBe(InvoiceStatus.UNPAID);
	});
});

describe("getInvoicePreview", () => {
	it("groups items per buyer and marks new buyers as CREATE", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch() as never);

		const result = await getInvoicePreview("batch-1");

		expect(result.batch.code).toBe("CH-015");
		expect(result.summary.totalBuyers).toBe(2);
		expect(result.summary.create).toBe(2);
		const maya = result.buyers.find((b) => b.buyerId === "buyer-a");
		expect(maya?.totalQty).toBe(3);
		expect(maya?.totalAmount).toBe(50000 * 2 + 120000);
	});

	it("marks invoices with approved payment as LOCKED and changed ones as UPDATE", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(
			mockBatch({
				invoices: [
					{
						id: "inv-a",
						buyerId: "buyer-a",
						totalAmount: "100000",
						itemDetail: [],
						invoiceStatus: InvoiceStatus.UNPAID,
						deadlinePayment: new Date(),
						payments: [{ id: "pay-1" }],
					},
					{
						id: "inv-b",
						buyerId: "buyer-b",
						totalAmount: "40000",
						itemDetail: [],
						invoiceStatus: InvoiceStatus.UNPAID,
						deadlinePayment: new Date(),
						payments: [],
					},
				],
			}) as never,
		);

		const result = await getInvoicePreview("batch-1");
		expect(result.buyers.find((b) => b.buyerId === "buyer-a")?.action).toBe(
			"LOCKED",
		);
		expect(result.buyers.find((b) => b.buyerId === "buyer-b")?.action).toBe(
			"UPDATE",
		);
	});

	it("skips JP buyers without harga jual", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(
			mockBatch({
				countryCode: CountryCode.JP,
				items: [
					{
						buyerId: "buyer-a",
						description: "JP Item",
						pcs: 1,
						hargaPerBuyer: null,
						hargaJualPerBuyer: null,
						buyer: { id: "buyer-a", name: "Maya", idLine: null },
					},
				],
			}) as never,
		);

		const result = await getInvoicePreview("batch-1");
		expect(result.buyers[0]?.action).toBe("SKIP_MISSING_PRICE");
	});

	it("throws BATCH_NOT_FOUND when batch missing", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(null);
		await expect(getInvoicePreview("x")).rejects.toMatchObject({
			code: "BATCH_NOT_FOUND",
		});
	});
});

describe("generateInvoices", () => {
	it("creates invoices, orders and notifications for new buyers", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch() as never);
		vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.invoice.create).mockImplementation((async (args: {
			data: { buyerId: string };
		}) => ({
			id: `inv-${args.data.buyerId}`,
		})) as never);

		const result = await generateInvoices({
			batchId: "batch-1",
			updateExisting: true,
			notifyBuyers: true,
		});

		expect(result.summary.created).toBe(2);
		expect(prisma.invoice.create).toHaveBeenCalledTimes(2);
		expect(prisma.order.create).toHaveBeenCalledTimes(2);
		expect(prisma.notification.create).toHaveBeenCalledTimes(2);
	});

	it("respects buyerIds filter and notifyBuyers=false", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch() as never);
		vi.mocked(prisma.order.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.invoice.create).mockResolvedValue({
			id: "inv-b",
		} as never);

		const result = await generateInvoices({
			batchId: "batch-1",
			buyerIds: ["buyer-b"],
			updateExisting: true,
			notifyBuyers: false,
		});

		expect(result.summary.processed).toBe(1);
		expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
		expect(prisma.notification.create).not.toHaveBeenCalled();
	});

	it("does not update existing invoice when updateExisting=false", async () => {
		vi.mocked(prisma.batch.findUnique).mockResolvedValue(
			mockBatch({
				items: [mockBatch().items[2]],
				invoices: [
					{
						id: "inv-b",
						buyerId: "buyer-b",
						totalAmount: "1",
						itemDetail: [],
						invoiceStatus: InvoiceStatus.UNPAID,
						deadlinePayment: new Date(),
						payments: [],
					},
				],
			}) as never,
		);

		const result = await generateInvoices({
			batchId: "batch-1",
			updateExisting: false,
			notifyBuyers: true,
		});

		expect(result.summary.skippedUpdateDisabled).toBe(1);
		expect(prisma.invoice.update).not.toHaveBeenCalled();
	});
});

describe("getInvoices", () => {
	it("computes running penalty and effective status", async () => {
		const deadline = new Date(Date.now() - 3 * DAY);
		vi.mocked(prisma.invoice.findMany).mockResolvedValue([
			{
				id: "clxinvoice000abc123",
				totalAmount: "100000",
				itemDetail: [{ item_name: "PC", qty: 2, harga_per_buyer: 50000 }],
				invoiceStatus: InvoiceStatus.UNPAID,
				deadlinePayment: deadline,
				penaltyWaived: false,
				createdAt: new Date(),
				buyer: { id: "b", name: "Maya", email: "m@x", idLine: null },
				batch: {
					id: "batch-1",
					title: "t",
					countryCode: CountryCode.CH,
					batchNumber: 15,
				},
				payments: [
					{ amount: "20000", verificationStatus: VerificationStatus.APPROVED },
					{ amount: "5000", verificationStatus: VerificationStatus.PENDING },
				],
			},
		] as never);
		vi.mocked(prisma.invoice.count).mockResolvedValue(1);

		const { data, meta } = await getInvoices({ page: 1, limit: 20 });

		expect(meta.total).toBe(1);
		expect(data[0]?.effectiveStatus).toBe(InvoiceStatus.OVERDUE);
		expect(data[0]?.penaltyAmount).toBeGreaterThan(0);
		expect(data[0]?.totalPaid).toBe(20000);
		expect(data[0]?.hasPendingProof).toBe(true);
		expect(data[0]?.invoiceNumber).toBe("INV-ABC123");
	});
});

describe("getInvoiceById", () => {
	it("throws INVOICE_NOT_FOUND", async () => {
		vi.mocked(prisma.invoice.findUnique).mockResolvedValue(null);
		await expect(getInvoiceById("x")).rejects.toMatchObject({
			code: "INVOICE_NOT_FOUND",
		});
	});
});

describe("waivePenalty", () => {
	it("rejects PAID invoice", async () => {
		vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
			id: "inv",
			invoiceStatus: InvoiceStatus.PAID,
			deadlinePayment: new Date(),
			penaltyWaived: false,
		} as never);

		await expect(
			waivePenalty("inv", { reason: "Buyer sakit" }, "admin"),
		).rejects.toMatchObject({ code: "INVOICE_ALREADY_PAID" });
	});

	it("rejects already waived invoice", async () => {
		vi.mocked(prisma.invoice.findUnique).mockResolvedValue({
			id: "inv",
			invoiceStatus: InvoiceStatus.OVERDUE,
			deadlinePayment: new Date(),
			penaltyWaived: true,
		} as never);

		await expect(
			waivePenalty("inv", { reason: "Buyer sakit" }, "admin"),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("marks invoice as waived with reason and admin id", async () => {
		vi.mocked(prisma.invoice.findUnique)
			.mockResolvedValueOnce({
				id: "inv",
				invoiceStatus: InvoiceStatus.OVERDUE,
				deadlinePayment: new Date(Date.now() - 2 * DAY),
				penaltyWaived: false,
			} as never)
			.mockResolvedValueOnce({
				id: "inv",
				totalAmount: "100000",
				itemDetail: [],
				invoiceStatus: InvoiceStatus.OVERDUE,
				deadlinePayment: new Date(Date.now() - 2 * DAY),
				penaltyWaived: true,
				penaltyWaivedReason: "Buyer sakit",
				penaltyWaivedAt: new Date(),
				penaltyWaivedById: "admin",
				buyer: {},
				batch: { countryCode: CountryCode.CH, batchNumber: 1 },
				payments: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			} as never);
		vi.mocked(prisma.user.findUnique).mockResolvedValue({
			id: "admin",
			name: "Owner",
		} as never);

		const result = await waivePenalty(
			"inv",
			{ reason: "Buyer sakit" },
			"admin",
		);

		expect(result.waivedAmount).toBeGreaterThan(0);
		expect(prisma.invoice.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					penaltyWaived: true,
					penaltyWaivedReason: "Buyer sakit",
					penaltyWaivedById: "admin",
				}),
			}),
		);
		expect(result.invoice.penalty.penaltyAmount).toBe(0);
		expect(result.invoice.penalty.waivedBy?.name).toBe("Owner");
	});
});
