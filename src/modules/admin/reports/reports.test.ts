import { beforeEach, describe, expect, it, vi } from "vitest";
import { CountryCode, PaymentMethod } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		batch: { findMany: vi.fn() },
		profitPeriod: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			delete: vi.fn(),
		},
		adminFeePeriod: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		payment: { findMany: vi.fn() },
		taxPayment: { findMany: vi.fn() },
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getProfitReport,
	createProfitPeriod,
	deleteProfitPeriod,
	getAdminFeeReport,
	createAdminFeePeriod,
	updateAdminFeePeriod,
	deleteAdminFeePeriod,
	getPaymentSummaryReport,
} = await import("./reports.service.js");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getProfitReport", () => {
	it("computes revenue, cost, grossProfit, netProfit and monthlyTrend", async () => {
		vi.mocked(prisma.batch.findMany).mockResolvedValue([
			{
				id: "b-1",
				countryCode: CountryCode.CH,
				batchNumber: 22,
				title: "CH 22",
				batchDate: new Date("2026-09-01"),
				hargaTotal: "500000",
				hargaTfSeller: "300000",
				selisihHarga: "200000",
				labaBersih: "185400",
			},
		] as never);
		vi.mocked(prisma.profitPeriod.findMany).mockResolvedValue([
			{
				id: "pp-1",
				periodName: "Agustus 2026",
				startDate: new Date("2026-08-01"),
				endDate: new Date("2026-08-31"),
				batchIds: ["b-1"],
				batchCodes: ["CH-022"],
				totalRevenue: "328232",
				packingCost: "100000",
				otherCost: "0",
				otherCostNote: null,
				totalCost: "100000",
				netProfit: "228232",
				adminAPercent: 80,
				adminBPercent: 20,
				goSavingsPercent: 0,
				adminAAmount: "182586",
				adminBAmount: "45646",
				goSavingsAmount: "0",
				notes: null,
				createdAt: new Date(),
			},
		] as never);

		const res = await getProfitReport({});
		expect(res.summary.revenue).toBe(500000);
		expect(res.summary.cost).toBe(300000);
		expect(res.summary.grossProfit).toBe(200000);
		expect(res.summary.netProfit).toBe(185400);
		expect(res.monthlyTrend[0]?.month).toBe("2026-08");
	});
});

describe("createProfitPeriod & deleteProfitPeriod", () => {
	it("creates profit period with admin splits", async () => {
		vi.mocked(prisma.batch.findMany).mockResolvedValue([
			{
				id: "b-1",
				countryCode: CountryCode.CH,
				batchNumber: 22,
				labaBersih: "185400",
			},
			{
				id: "b-2",
				countryCode: CountryCode.KR,
				batchNumber: 17,
				labaBersih: "142832",
			},
		] as never);
		vi.mocked(prisma.profitPeriod.create).mockResolvedValue({
			id: "pp-new",
			periodName: "TAX 1-3",
			startDate: new Date("2026-09-01"),
			endDate: new Date("2026-09-30"),
			batchIds: ["b-1", "b-2"],
			batchCodes: ["CH-022", "KR-017"],
			totalRevenue: "328232",
			packingCost: "304506",
			otherCost: "57697",
			otherCostNote: "desain logo",
			totalCost: "362203",
			netProfit: "-33971",
			adminAPercent: 80,
			adminBPercent: 20,
			goSavingsPercent: 0,
			adminAAmount: "0",
			adminBAmount: "0",
			goSavingsAmount: "0",
			notes: null,
			createdAt: new Date(),
		} as never);

		const created = await createProfitPeriod({
			periodName: "TAX 1-3",
			startDate: new Date("2026-09-01"),
			endDate: new Date("2026-09-30"),
			batchIds: ["b-1", "b-2"],
			packingCost: 304506,
			otherCost: 57697,
			otherCostNote: "desain logo",
			adminAPercent: 80,
			adminBPercent: 20,
			goSavingsPercent: 0,
		});

		expect(created.netProfit).toBe(-33971);
		expect(created.adminAAmount).toBe(0);
	});

	it("throws NOT_FOUND when any selected batch is missing", async () => {
		vi.mocked(prisma.batch.findMany).mockResolvedValue([
			{
				id: "b-1",
				countryCode: CountryCode.CH,
				batchNumber: 22,
				labaBersih: "185400",
			},
		] as never);

		await expect(
			createProfitPeriod({
				periodName: "TAX 1-3",
				startDate: new Date("2026-09-01"),
				endDate: new Date("2026-09-30"),
				batchIds: ["b-1", "b-missing"],
				packingCost: 0,
				otherCost: 0,
				adminAPercent: 80,
				adminBPercent: 20,
				goSavingsPercent: 0,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("deletes profit period", async () => {
		vi.mocked(prisma.profitPeriod.findUnique).mockResolvedValue({
			id: "pp-1",
		} as never);
		vi.mocked(prisma.profitPeriod.delete).mockResolvedValue({
			id: "pp-1",
		} as never);
		expect(await deleteProfitPeriod("pp-1")).toEqual({
			id: "pp-1",
			deleted: true,
		});
	});
});

describe("AdminFeePeriod CRUD", () => {
	it("computes summary and creates/updates/deletes admin fee period", async () => {
		vi.mocked(prisma.adminFeePeriod.findMany).mockResolvedValue([
			{
				id: "af-1",
				periodName: "September 2026",
				adminName: "Ira",
				batchCount: 2,
				batchIds: [],
				feeNyelem: "15000",
				feeRekap: "30000",
				totalFee: "45000",
				notes: null,
				createdAt: new Date(),
			},
		] as never);

		const report = await getAdminFeeReport({});
		expect(report.summary).toEqual({
			totalFee: 45000,
			periodCount: 1,
			batchCount: 2,
		});

		vi.mocked(prisma.adminFeePeriod.create).mockResolvedValue({
			id: "af-2",
			periodName: "September 2026",
			adminName: "Nadia",
			batchCount: 1,
			batchIds: [],
			feeNyelem: "12000",
			feeRekap: "15000",
			totalFee: "27000",
			notes: null,
			createdAt: new Date(),
		} as never);
		const created = await createAdminFeePeriod({
			periodName: "September 2026",
			adminName: "Nadia",
			batchCount: 1,
			batchIds: [],
			feeNyelem: 12000,
			feeRekap: 15000,
		});
		expect(created.totalFee).toBe(27000);

		vi.mocked(prisma.adminFeePeriod.findUnique).mockResolvedValue({
			id: "af-2",
			feeNyelem: "12000",
			feeRekap: "15000",
		} as never);
		vi.mocked(prisma.adminFeePeriod.update).mockResolvedValue({
			id: "af-2",
			periodName: "September 2026",
			adminName: "Nadia",
			batchCount: 1,
			batchIds: [],
			feeNyelem: "20000",
			feeRekap: "15000",
			totalFee: "35000",
			notes: null,
			createdAt: new Date(),
		} as never);
		const updated = await updateAdminFeePeriod("af-2", { feeNyelem: 20000 });
		expect(updated.totalFee).toBe(35000);

		vi.mocked(prisma.adminFeePeriod.delete).mockResolvedValue({
			id: "af-2",
		} as never);
		expect(await deleteAdminFeePeriod("af-2")).toEqual({
			id: "af-2",
			deleted: true,
		});
	});
});

describe("getPaymentSummaryReport", () => {
	it("aggregates approved batch and tax payments by method", async () => {
		vi.mocked(prisma.payment.findMany).mockResolvedValue([
			{
				paymentMethod: PaymentMethod.BCA,
				amount: "60000",
				paymentDate: new Date("2026-09-17"),
				createdAt: new Date("2026-09-17"),
			},
		] as never);
		vi.mocked(prisma.taxPayment.findMany).mockResolvedValue([
			{
				paymentMethod: PaymentMethod.QRIS,
				amount: "40000",
				paymentDate: new Date("2026-09-16"),
				createdAt: new Date("2026-09-16"),
			},
		] as never);

		const summary = await getPaymentSummaryReport({});
		expect(summary.total.totalAmount).toBe(100000);
		expect(summary.total.count).toBe(2);
		expect(summary.methods[0]?.paymentMethod).toBe(PaymentMethod.BCA);
		expect(summary.methods[0]?.sharePercent).toBe(60);
	});
});
