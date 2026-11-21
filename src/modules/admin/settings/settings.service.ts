import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { UpdateSettingsInput } from "./settings.schema.js";

export const DEFAULT_SETTINGS = {
	defaultFeeNyelem: 2000,
	dailyRate: { CH: 2250, KR: 11.8, TH: 450, JP: 108 },
	penaltyPerDay: 2000,
	deadlineBatchHours: 24,
	deadlineTaxHours: 72,
	taxRatePcChThJp: 7000,
	taxRatePcKr: 6000,
	taxRateNonPcPerGram: null as number | null,
	feeRekapTiers: [
		{ min_pcs: 1, max_pcs: 10, fee: 15000, label: "Tier 1 · 1-10 PC" },
		{ min_pcs: 11, max_pcs: 25, fee: 25000, label: "Tier 2 · 11-25 PC" },
		{ min_pcs: 26, max_pcs: null, fee: 40000, label: "Tier 3 · 26+ PC" },
	],
	maxStorageDays: 60,
	csContact: null as string | null,
	googleFormUrl: null as string | null,
	shopeeCheckoutUrl: null as string | null,
	checkoutStartDate: null as Date | null,
	checkoutEndDate: null as Date | null,
	googleFormOpen: false,
	shopeeOpen: false,
};

function formatSettings(row: {
	id: string;
	defaultFeeNyelem: Prisma.Decimal | number | string;
	dailyRate: Prisma.JsonValue;
	penaltyPerDay: Prisma.Decimal | number | string;
	deadlineBatchHours: number;
	deadlineTaxHours: number;
	taxRatePcChThJp: Prisma.Decimal | number | string;
	taxRatePcKr: Prisma.Decimal | number | string;
	taxRateNonPcPerGram: Prisma.Decimal | number | string | null;
	feeRekapTiers: Prisma.JsonValue;
	maxStorageDays: number;
	csContact: string | null;
	googleFormUrl: string | null;
	shopeeCheckoutUrl: string | null;
	checkoutStartDate: Date | null;
	checkoutEndDate: Date | null;
	googleFormOpen: boolean;
	shopeeOpen: boolean;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		defaultFeeNyelem: Number(row.defaultFeeNyelem),
		dailyRate: row.dailyRate,
		penaltyPerDay: Number(row.penaltyPerDay),
		deadlineBatchHours: row.deadlineBatchHours,
		deadlineTaxHours: row.deadlineTaxHours,
		taxRatePcChThJp: Number(row.taxRatePcChThJp),
		taxRatePcKr: Number(row.taxRatePcKr),
		taxRateNonPcPerGram:
			row.taxRateNonPcPerGram !== null ? Number(row.taxRateNonPcPerGram) : null,
		feeRekapTiers: row.feeRekapTiers,
		maxStorageDays: row.maxStorageDays,
		csContact: row.csContact,
		googleFormUrl: row.googleFormUrl,
		shopeeCheckoutUrl: row.shopeeCheckoutUrl,
		checkoutStartDate: row.checkoutStartDate,
		checkoutEndDate: row.checkoutEndDate,
		googleFormOpen: row.googleFormOpen,
		shopeeOpen: row.shopeeOpen,
		updatedAt: row.updatedAt,
	};
}

async function ensureSingleton() {
	const existing = await prisma.setting.findUnique({
		where: { id: "singleton" },
	});
	if (existing) return existing;

	return prisma.setting.create({
		data: {
			id: "singleton",
			defaultFeeNyelem: DEFAULT_SETTINGS.defaultFeeNyelem,
			dailyRate: DEFAULT_SETTINGS.dailyRate as Prisma.InputJsonValue,
			penaltyPerDay: DEFAULT_SETTINGS.penaltyPerDay,
			deadlineBatchHours: DEFAULT_SETTINGS.deadlineBatchHours,
			deadlineTaxHours: DEFAULT_SETTINGS.deadlineTaxHours,
			taxRatePcChThJp: DEFAULT_SETTINGS.taxRatePcChThJp,
			taxRatePcKr: DEFAULT_SETTINGS.taxRatePcKr,
			taxRateNonPcPerGram: DEFAULT_SETTINGS.taxRateNonPcPerGram,
			feeRekapTiers: DEFAULT_SETTINGS.feeRekapTiers as Prisma.InputJsonValue,
			maxStorageDays: DEFAULT_SETTINGS.maxStorageDays,
		},
	});
}

export async function getSettings() {
	const row = await ensureSingleton();
	return formatSettings(row);
}

export async function updateSettings(input: UpdateSettingsInput) {
	const current = await ensureSingleton();

	const mergedDailyRate = input.dailyRate
		? {
				...((current.dailyRate as Record<string, number>) ??
					DEFAULT_SETTINGS.dailyRate),
				...input.dailyRate,
			}
		: undefined;

	const updated = await prisma.setting.update({
		where: { id: "singleton" },
		data: {
			...(input.defaultFeeNyelem !== undefined && {
				defaultFeeNyelem: input.defaultFeeNyelem,
			}),
			...(mergedDailyRate !== undefined && {
				dailyRate: mergedDailyRate as Prisma.InputJsonValue,
			}),
			...(input.penaltyPerDay !== undefined && {
				penaltyPerDay: input.penaltyPerDay,
			}),
			...(input.deadlineBatchHours !== undefined && {
				deadlineBatchHours: input.deadlineBatchHours,
			}),
			...(input.deadlineTaxHours !== undefined && {
				deadlineTaxHours: input.deadlineTaxHours,
			}),
			...(input.taxRatePcChThJp !== undefined && {
				taxRatePcChThJp: input.taxRatePcChThJp,
			}),
			...(input.taxRatePcKr !== undefined && {
				taxRatePcKr: input.taxRatePcKr,
			}),
			...(input.taxRateNonPcPerGram !== undefined && {
				taxRateNonPcPerGram: input.taxRateNonPcPerGram,
			}),
			...(input.feeRekapTiers !== undefined && {
				feeRekapTiers: input.feeRekapTiers as unknown as Prisma.InputJsonValue,
			}),
			...(input.maxStorageDays !== undefined && {
				maxStorageDays: input.maxStorageDays,
			}),
			...(input.csContact !== undefined && { csContact: input.csContact }),
			...(input.googleFormUrl !== undefined && {
				googleFormUrl: input.googleFormUrl,
			}),
			...(input.shopeeCheckoutUrl !== undefined && {
				shopeeCheckoutUrl: input.shopeeCheckoutUrl,
			}),
			...(input.checkoutStartDate !== undefined && {
				checkoutStartDate: input.checkoutStartDate,
			}),
			...(input.checkoutEndDate !== undefined && {
				checkoutEndDate: input.checkoutEndDate,
			}),
			...(input.googleFormOpen !== undefined && {
				googleFormOpen: input.googleFormOpen,
			}),
			...(input.shopeeOpen !== undefined && { shopeeOpen: input.shopeeOpen }),
		},
	});

	return formatSettings(updated);
}

export async function resetSettingsToDefault() {
	await ensureSingleton();
	const updated = await prisma.setting.update({
		where: { id: "singleton" },
		data: {
			defaultFeeNyelem: DEFAULT_SETTINGS.defaultFeeNyelem,
			dailyRate: DEFAULT_SETTINGS.dailyRate as Prisma.InputJsonValue,
			penaltyPerDay: DEFAULT_SETTINGS.penaltyPerDay,
			deadlineBatchHours: DEFAULT_SETTINGS.deadlineBatchHours,
			deadlineTaxHours: DEFAULT_SETTINGS.deadlineTaxHours,
			taxRatePcChThJp: DEFAULT_SETTINGS.taxRatePcChThJp,
			taxRatePcKr: DEFAULT_SETTINGS.taxRatePcKr,
			taxRateNonPcPerGram: DEFAULT_SETTINGS.taxRateNonPcPerGram,
			feeRekapTiers: DEFAULT_SETTINGS.feeRekapTiers as Prisma.InputJsonValue,
			maxStorageDays: DEFAULT_SETTINGS.maxStorageDays,
			csContact: DEFAULT_SETTINGS.csContact,
			googleFormUrl: DEFAULT_SETTINGS.googleFormUrl,
			shopeeCheckoutUrl: DEFAULT_SETTINGS.shopeeCheckoutUrl,
			checkoutStartDate: DEFAULT_SETTINGS.checkoutStartDate,
			checkoutEndDate: DEFAULT_SETTINGS.checkoutEndDate,
			googleFormOpen: DEFAULT_SETTINGS.googleFormOpen,
			shopeeOpen: DEFAULT_SETTINGS.shopeeOpen,
		},
	});

	return formatSettings(updated);
}
