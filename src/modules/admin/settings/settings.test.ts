import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		setting: {
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getSettings,
	updateSettings,
	resetSettingsToDefault,
	DEFAULT_SETTINGS,
} = await import("./settings.service.js");

function mockSettingRow(overrides: Record<string, unknown> = {}) {
	return {
		id: "singleton",
		defaultFeeNyelem: "10000",
		dailyRate: { CH: 2350, KR: 12.4, TH: 475, JP: 108 },
		penaltyPerDay: "5000",
		deadlineBatchHours: 24,
		deadlineTaxHours: 72,
		taxRatePcChThJp: "18000",
		taxRatePcKr: "20000",
		taxRateNonPcPerGram: "85",
		feeRekapTiers: DEFAULT_SETTINGS.feeRekapTiers,
		maxStorageDays: 30,
		csContact: null,
		googleFormUrl: "https://forms.gle/abc",
		shopeeCheckoutUrl: "https://shopee.co.id/xyz",
		checkoutStartDate: new Date("2026-10-12"),
		checkoutEndDate: new Date("2026-10-18"),
		googleFormOpen: true,
		shopeeOpen: false,
		updatedAt: new Date(),
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("getSettings", () => {
	it("returns existing singleton settings", async () => {
		vi.mocked(prisma.setting.findUnique).mockResolvedValue(
			mockSettingRow() as never,
		);

		const res = await getSettings();
		expect(res.defaultFeeNyelem).toBe(10000);
		expect(res.googleFormOpen).toBe(true);
		expect(res.taxRateNonPcPerGram).toBe(85);
	});

	it("creates singleton with defaults when not found", async () => {
		vi.mocked(prisma.setting.findUnique).mockResolvedValue(null);
		vi.mocked(prisma.setting.create).mockResolvedValue(
			mockSettingRow({ defaultFeeNyelem: "2000" }) as never,
		);

		const res = await getSettings();
		expect(prisma.setting.create).toHaveBeenCalledTimes(1);
		expect(res.defaultFeeNyelem).toBe(2000);
	});
});

describe("updateSettings", () => {
	it("merges partial dailyRate and updates checkout links", async () => {
		vi.mocked(prisma.setting.findUnique).mockResolvedValue(
			mockSettingRow() as never,
		);
		vi.mocked(prisma.setting.update).mockResolvedValue(
			mockSettingRow({
				dailyRate: { CH: 2400, KR: 12.4, TH: 475, JP: 108 },
				shopeeOpen: true,
			}) as never,
		);

		const res = await updateSettings({
			dailyRate: { CH: 2400 },
			shopeeOpen: true,
		});

		expect(prisma.setting.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					dailyRate: { CH: 2400, KR: 12.4, TH: 475, JP: 108 },
					shopeeOpen: true,
				}),
			}),
		);
		expect(res.shopeeOpen).toBe(true);
	});
});

describe("resetSettingsToDefault", () => {
	it("resets settings back to DEFAULT_SETTINGS", async () => {
		vi.mocked(prisma.setting.findUnique).mockResolvedValue(
			mockSettingRow() as never,
		);
		vi.mocked(prisma.setting.update).mockResolvedValue(
			mockSettingRow({
				defaultFeeNyelem: String(DEFAULT_SETTINGS.defaultFeeNyelem),
				googleFormOpen: false,
			}) as never,
		);

		const res = await resetSettingsToDefault();
		expect(prisma.setting.update).toHaveBeenCalledTimes(1);
		expect(res.defaultFeeNyelem).toBe(DEFAULT_SETTINGS.defaultFeeNyelem);
	});
});
