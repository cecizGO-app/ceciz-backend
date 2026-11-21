import { beforeEach, describe, expect, it, vi } from "vitest";
import { CashflowType, PaymentMethod } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		cashflowEntry: {
			aggregate: vi.fn(),
			count: vi.fn(),
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getCashflowStats,
	getCashflowEntries,
	createCashflowEntry,
	updateCashflowEntry,
	deleteCashflowEntry,
} = await import("./cashflow.service.js");

function mockEntry(overrides: Record<string, unknown> = {}) {
	return {
		id: "cf-1",
		entryDate: new Date("2026-11-21"),
		description: "Fee Admin Nyelem Batch JP-015",
		amount: "280000",
		type: CashflowType.EXPENSE,
		category: "Fee Admin / Gaji Nyelem & Rekap",
		paymentMethod: PaymentMethod.SEABANK,
		notes: "Fee nyelem 140 photocard x 2.000",
		createdById: "admin-1",
		createdBy: { id: "admin-1", name: "Aurel", role: "OWNER" },
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getCashflowStats", () => {
	it("computes netBalance, totalIncome, totalExpense, totalCount, and categories", async () => {
		vi.mocked(prisma.cashflowEntry.aggregate)
			.mockResolvedValueOnce({ _sum: { amount: "19920000" } } as never)
			.mockResolvedValueOnce({ _sum: { amount: "7845000" } } as never);
		vi.mocked(prisma.cashflowEntry.count).mockResolvedValue(7);
		vi.mocked(prisma.cashflowEntry.findMany).mockResolvedValue([
			{ category: "Bahan Packing" },
			{ category: "Fee Admin" },
		] as never);

		const stats = await getCashflowStats();

		expect(stats.totalIncome).toBe(19920000);
		expect(stats.totalExpense).toBe(7845000);
		expect(stats.netBalance).toBe(12075000);
		expect(stats.totalCount).toBe(7);
		expect(stats.categories).toEqual(["Bahan Packing", "Fee Admin"]);
	});
});

describe("getCashflowEntries", () => {
	it("returns formatted entries with pagination meta", async () => {
		vi.mocked(prisma.cashflowEntry.findMany).mockResolvedValue([
			mockEntry(),
		] as never);
		vi.mocked(prisma.cashflowEntry.count).mockResolvedValue(1);

		const result = await getCashflowEntries({ page: 1, limit: 20 });

		expect(result.meta.total).toBe(1);
		expect(result.data[0]?.amount).toBe(280000);
		expect(result.data[0]?.createdBy.name).toBe("Aurel");
	});
});

describe("createCashflowEntry", () => {
	it("creates cashflow entry with admin user id", async () => {
		vi.mocked(prisma.cashflowEntry.create).mockResolvedValue(
			mockEntry() as never,
		);

		const created = await createCashflowEntry(
			{
				entryDate: new Date("2026-11-21"),
				type: CashflowType.EXPENSE,
				amount: 280000,
				category: "Fee Admin",
				paymentMethod: PaymentMethod.SEABANK,
				description: "Fee Admin Nyelem Batch JP-015",
				notes: "Fee nyelem 140 photocard x 2.000",
			},
			"admin-1",
		);

		expect(created.id).toBe("cf-1");
		expect(prisma.cashflowEntry.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ createdById: "admin-1" }),
			}),
		);
	});
});

describe("updateCashflowEntry", () => {
	it("throws NOT_FOUND when entry missing", async () => {
		vi.mocked(prisma.cashflowEntry.findUnique).mockResolvedValue(null);
		await expect(
			updateCashflowEntry("missing", { amount: 1000 }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("updates existing entry", async () => {
		vi.mocked(prisma.cashflowEntry.findUnique).mockResolvedValue({
			id: "cf-1",
		} as never);
		vi.mocked(prisma.cashflowEntry.update).mockResolvedValue(
			mockEntry({ amount: "300000" }) as never,
		);

		const updated = await updateCashflowEntry("cf-1", { amount: 300000 });
		expect(updated.amount).toBe(300000);
	});
});

describe("deleteCashflowEntry", () => {
	it("deletes existing entry", async () => {
		vi.mocked(prisma.cashflowEntry.findUnique).mockResolvedValue({
			id: "cf-1",
		} as never);
		vi.mocked(prisma.cashflowEntry.delete).mockResolvedValue({
			id: "cf-1",
		} as never);

		const res = await deleteCashflowEntry("cf-1");
		expect(res).toEqual({ id: "cf-1", deleted: true });
	});
});
