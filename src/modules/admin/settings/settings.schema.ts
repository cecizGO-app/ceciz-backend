import { z } from "zod";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const dailyRateSchema = z.object({
	CH: z.coerce.number().positive(),
	KR: z.coerce.number().positive(),
	TH: z.coerce.number().positive(),
	JP: z.coerce.number().positive(),
});

export const feeRekapTierSchema = z.object({
	min_pcs: z.coerce.number().int().positive(),
	max_pcs: z.coerce.number().int().positive().nullable(),
	fee: z.coerce.number().nonnegative(),
	label: z.string().trim().optional(),
});

export const updateSettingsSchema = z.object({
	defaultFeeNyelem: emptyStringToUndefined(
		z.coerce.number().nonnegative().optional(),
	),
	dailyRate: dailyRateSchema.partial().optional(),
	penaltyPerDay: emptyStringToUndefined(
		z.coerce.number().nonnegative().optional(),
	),
	deadlineBatchHours: emptyStringToUndefined(
		z.coerce.number().int().positive().optional(),
	),
	deadlineTaxHours: emptyStringToUndefined(
		z.coerce.number().int().positive().optional(),
	),
	taxRatePcChThJp: emptyStringToUndefined(
		z.coerce.number().nonnegative().optional(),
	),
	taxRatePcKr: emptyStringToUndefined(
		z.coerce.number().nonnegative().optional(),
	),
	taxRateNonPcPerGram: z.coerce.number().nonnegative().nullable().optional(),
	feeRekapTiers: z.array(feeRekapTierSchema).min(1).optional(),
	maxStorageDays: emptyStringToUndefined(
		z.coerce.number().int().positive().optional(),
	),
	csContact: emptyStringToUndefined(
		z.string().trim().max(200).nullable().optional(),
	),
	// Link Checkout Buyer
	googleFormUrl: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
	shopeeCheckoutUrl: emptyStringToUndefined(
		z.string().trim().max(500).nullable().optional(),
	),
	checkoutStartDate: emptyStringToUndefined(
		z.coerce.date().nullable().optional(),
	),
	checkoutEndDate: emptyStringToUndefined(
		z.coerce.date().nullable().optional(),
	),
	googleFormOpen: z.boolean().optional(),
	shopeeOpen: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
