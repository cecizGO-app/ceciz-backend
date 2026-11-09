import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	TaxInvoiceStatus,
	TrackingStatus,
	VerificationStatus,
} from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		taxInvoice: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
		},
		taxPayment: {
			findFirst: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			count: vi.fn(),
			aggregate: vi.fn(),
		},
		batch: {
			findMany: vi.fn(),
		},
		setting: {
			findUnique: vi.fn(),
		},
		notification: {
			create: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(prisma)),
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getTaxStats,
	getTaxInvoices,
	getTaxInvoiceById,
	getTaxPreview,
	releaseTaxInvoices,
	verifyTaxPayment,
	bulkVerifyTaxPayments,
} = await import("./tax.service.js");

describe("Admin Tax Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getTaxStats", () => {
		it("calculates correct statistics matching dashboard cards", async () => {
			vi.mocked(prisma.taxInvoice.findFirst).mockResolvedValue({
				releaseName: "TAGIHAN TAX 2",
				releasePeriod: "September 2026",
			} as never);

			vi.mocked(prisma.taxInvoice.findMany)
				.mockResolvedValueOnce([
					{ taxInvoiceTotal: "2000000" },
					{ taxInvoiceTotal: "2250000" },
				] as never)
				.mockResolvedValueOnce([
					{ releasePeriod: "September 2026" },
					{ releasePeriod: "Agustus 2026" },
				] as never);

			vi.mocked(prisma.taxPayment.count).mockResolvedValue(8);

			vi.mocked(prisma.taxPayment.aggregate).mockResolvedValue({
				_sum: { amount: "12840000" },
			} as never);

			const stats = await getTaxStats();

			expect(stats.activePeriod).toBe("TAGIHAN TAX 2");
			expect(stats.activePeriodMonth).toBe("September 2026");
			expect(stats.outstandingAmount).toBe(4250000);
			expect(stats.outstandingInvoicesCount).toBe(2);
			expect(stats.pendingVerificationCount).toBe(8);
			expect(stats.paidThisMonthAmount).toBe(12840000);
			expect(stats.availablePeriods).toEqual([
				"September 2026",
				"Agustus 2026",
			]);
		});
	});

	describe("getTaxInvoices", () => {
		it("returns formatted list of tax invoices with display status and badge batches", async () => {
			const mockInvoice = {
				id: "cm1234567890",
				releaseName: "TAGIHAN TAX 2",
				releasePeriod: "September 2026",
				buyerId: "buyer-1",
				coveredBatchIds: ["batch-ch-15", "batch-jp-9"],
				breakdownDetail: [
					{
						batch_id: "batch-ch-15",
						batch_number: 15,
						country: "CH",
						item_desc: "Photocard A",
						qty: 2,
						category: "PC",
						rate_tax: 7000,
						subtotal_tax: 14000,
					},
					{
						batch_id: "batch-jp-9",
						batch_number: 9,
						country: "JP",
						item_desc: "Album B",
						qty: 1,
						category: "Album",
						rate_tax: 48000,
						subtotal_tax: 48000,
					},
				],
				taxInvoiceTotal: "62000",
				deadlinePayment: new Date("2026-09-25T23:59:00Z"),
				maxCheckoutDate: new Date("2026-11-24T23:59:00Z"),
				status: TaxInvoiceStatus.RELEASED,
				createdAt: new Date("2026-09-22T10:00:00Z"),
				buyer: {
					id: "buyer-1",
					name: "Talia Novita",
					email: "talia@example.com",
					contact: "08123456789",
					idLine: "talianov",
					image: null,
				},
				payments: [
					{
						id: "pay-1",
						amount: "62000",
						taxVerificationStatus: VerificationStatus.PENDING,
						createdAt: new Date(),
					},
				],
			};

			vi.mocked(prisma.taxInvoice.findMany).mockResolvedValue([
				mockInvoice,
			] as never);
			vi.mocked(prisma.taxInvoice.count).mockResolvedValue(1);

			vi.mocked(prisma.batch.findMany).mockResolvedValue([
				{ id: "batch-ch-15", countryCode: "CH", batchNumber: 15 },
				{ id: "batch-jp-9", countryCode: "JP", batchNumber: 9 },
			] as never);

			const result = await getTaxInvoices({ page: 1, limit: 20 });

			expect(result.data).toHaveLength(1);
			const row = result.data[0]!;
			expect(row.invoiceNumber).toBe("TAX-7890");
			expect(row.buyer.name).toBe("Talia Novita");
			expect(row.buyer.idLine).toBe("talianov");
			expect(row.coveredBatches).toEqual(["CH-015", "JP-009"]);
			expect(row.totalItem).toBe(3);
			expect(row.totalTax).toBe(62000);
			expect(row.displayStatus).toBe("Pending");
			expect(row.hasPaymentProof).toBe(true);
			expect(row.pendingPaymentsCount).toBe(1);
		});
	});

	describe("getTaxInvoiceById", () => {
		it("returns single tax invoice detail", async () => {
			vi.mocked(prisma.taxInvoice.findUnique).mockResolvedValue({
				id: "tax-1234",
				releaseName: "TAGIHAN TAX 1",
				releasePeriod: "September 2026",
				taxInvoiceTotal: "100000",
				penaltyAmount: "0",
				deadlinePayment: new Date(),
				maxCheckoutDate: new Date(),
				status: TaxInvoiceStatus.RELEASED,
				coveredBatchIds: [],
				breakdownDetail: [],
				payments: [],
				createdAt: new Date(),
				updatedAt: new Date(),
				buyer: {
					id: "buyer-1",
					name: "Buyer 1",
					email: "b1@test.com",
					contact: null,
					idLine: "line1",
					address: null,
					image: null,
				},
			} as never);

			const result = await getTaxInvoiceById("tax-1234");
			expect(result.id).toBe("tax-1234");
			expect(result.totalTax).toBe(100000);
		});
	});

	describe("getTaxPreview", () => {
		it("calculates preview of items arrived at WH INA that have not been taxed", async () => {
			vi.mocked(prisma.setting.findUnique).mockResolvedValue({
				id: "singleton",
				taxRatePcChThJp: "7000",
				taxRatePcKr: "6000",
				taxRateNonPcPerGram: "48000",
				deadlineTaxHours: 72,
				maxStorageDays: 60,
			} as never);

			vi.mocked(prisma.batch.findMany).mockResolvedValue([
				{
					id: "batch-ch-25",
					countryCode: "CH",
					batchNumber: 25,
					tracking: { trackingStatus: TrackingStatus.ARRIVED_WH_INA },
					items: [
						{
							id: "item-1",
							buyerId: "buyer-1",
							description: "IVE Switch Photocard",
							pcs: 3,
							buyer: {
								id: "buyer-1",
								name: "Maya Putri",
								idLine: "mayaputri",
								email: "maya@example.com",
							},
						},
					],
				},
				{
					id: "batch-kr-19",
					countryCode: "KR",
					batchNumber: 19,
					tracking: { trackingStatus: TrackingStatus.ARRIVED_WH_INA },
					items: [
						{
							id: "item-2",
							buyerId: "buyer-2",
							description: "NCT Wish Album",
							pcs: 2,
							buyer: {
								id: "buyer-2",
								name: "Nadya Salsabila",
								idLine: null,
								email: "nadya@example.com",
							},
						},
					],
				},
			] as never);

			vi.mocked(prisma.taxInvoice.findMany).mockResolvedValue([]);

			const preview = await getTaxPreview();

			expect(preview.summary.totalItems).toBe(2);
			expect(preview.summary.totalBuyers).toBe(2);
			expect(preview.summary.totalBatches).toBe(2);

			const chItem = preview.items.find((i) => i.itemId === "item-1")!;
			expect(chItem.category).toBe("PC");
			expect(chItem.rateAcuan).toBe(7000);
			expect(chItem.subtotal).toBe(21000); // 3 * 7000

			const krItem = preview.items.find((i) => i.itemId === "item-2")!;
			expect(krItem.category).toBe("Non-PC");
			expect(krItem.rateAcuan).toBe(48000);
			expect(krItem.subtotal).toBe(96000); // 2 * 48000
		});
	});

	describe("releaseTaxInvoices", () => {
		it("groups items by buyer and creates TaxInvoices with in-app notification", async () => {
			vi.mocked(prisma.setting.findUnique).mockResolvedValue({
				id: "singleton",
				deadlineTaxHours: 72,
				maxStorageDays: 60,
			} as never);

			vi.mocked(prisma.batch.findMany).mockResolvedValue([
				{ id: "batch-1", countryCode: "CH", batchNumber: 25 },
			] as never);

			vi.mocked(prisma.taxInvoice.create).mockResolvedValue({
				id: "tax-inv-1",
				releaseName: "TAGIHAN TAX 24",
				releasePeriod: "September 2026",
				taxInvoiceTotal: "21000",
				buyerId: "buyer-1",
			} as never);

			const result = await releaseTaxInvoices({
				releaseName: "TAGIHAN TAX 24",
				releasePeriod: "September 2026",
				items: [
					{
						itemId: "item-1",
						buyerId: "buyer-1",
						batchId: "batch-1",
						item: "IVE Switch Photocard (3 pcs)",
						pcs: 3,
						category: "PC",
						rateAcuan: 7000,
						rateLabel: "Rp 7.000 / pcs",
						subtotal: 21000,
					},
				],
			});

			expect(result.success).toBe(true);
			expect(result.totalInvoicesCreated).toBe(1);
			expect(result.totalNominalTax).toBe(21000);
			expect(prisma.taxInvoice.create).toHaveBeenCalledTimes(1);
			expect(prisma.notification.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("verifyTaxPayment", () => {
		it("approves payment and marks invoice PAID when fully paid", async () => {
			vi.mocked(prisma.taxPayment.findUnique).mockResolvedValue({
				id: "pay-1",
				taxInvoiceId: "tax-inv-1",
				buyerId: "buyer-1",
				amount: "100000",
				taxInvoice: {
					id: "tax-inv-1",
					releaseName: "TAGIHAN TAX 24",
					taxInvoiceTotal: "100000",
				},
			} as never);

			vi.mocked(prisma.taxPayment.update).mockResolvedValue({
				id: "pay-1",
				taxVerificationStatus: VerificationStatus.APPROVED,
				rejectReason: null,
				verifiedAt: new Date(),
			} as never);

			vi.mocked(prisma.taxPayment.aggregate).mockResolvedValue({
				_sum: { amount: "100000" },
			} as never);

			const result = await verifyTaxPayment("pay-1", { status: "APPROVED" });

			expect(result.taxVerificationStatus).toBe(VerificationStatus.APPROVED);
			expect(prisma.taxInvoice.update).toHaveBeenCalledWith({
				where: { id: "tax-inv-1" },
				data: { status: TaxInvoiceStatus.PAID },
			});
			expect(prisma.notification.create).toHaveBeenCalledTimes(1);
		});

		it("rejects payment with reason and creates rejection notification", async () => {
			vi.mocked(prisma.taxPayment.findUnique).mockResolvedValue({
				id: "pay-1",
				taxInvoiceId: "tax-inv-1",
				buyerId: "buyer-1",
				amount: "100000",
				taxInvoice: {
					id: "tax-inv-1",
					releaseName: "TAGIHAN TAX 24",
					taxInvoiceTotal: "100000",
				},
			} as never);

			vi.mocked(prisma.taxPayment.update).mockResolvedValue({
				id: "pay-1",
				taxVerificationStatus: VerificationStatus.REJECTED,
				rejectReason: "Nominal tidak sesuai",
				verifiedAt: new Date(),
			} as never);

			const result = await verifyTaxPayment("pay-1", {
				status: "REJECTED",
				rejectReason: "Nominal tidak sesuai",
			});

			expect(result.taxVerificationStatus).toBe(VerificationStatus.REJECTED);
			expect(result.rejectReason).toBe("Nominal tidak sesuai");
			expect(prisma.notification.create).toHaveBeenCalledTimes(1);
		});
	});

	describe("bulkVerifyTaxPayments", () => {
		it("processes multiple payment verifications", async () => {
			vi.mocked(prisma.taxPayment.findUnique).mockResolvedValue({
				id: "pay-1",
				taxInvoiceId: "tax-inv-1",
				buyerId: "buyer-1",
				amount: "50000",
				taxInvoice: {
					id: "tax-inv-1",
					releaseName: "TAGIHAN TAX 24",
					taxInvoiceTotal: "50000",
				},
			} as never);

			vi.mocked(prisma.taxPayment.update).mockResolvedValue({
				id: "pay-1",
				taxVerificationStatus: VerificationStatus.APPROVED,
				rejectReason: null,
				verifiedAt: new Date(),
			} as never);

			vi.mocked(prisma.taxPayment.aggregate).mockResolvedValue({
				_sum: { amount: "50000" },
			} as never);

			const bulk = await bulkVerifyTaxPayments({
				paymentIds: ["pay-1"],
				status: "APPROVED",
			});

			expect(bulk.totalProcessed).toBe(1);
			expect(bulk.successfulCount).toBe(1);
		});
	});
});
