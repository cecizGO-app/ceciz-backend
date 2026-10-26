import { z } from "zod";
import { CountryCode, TrackingStatus } from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const updateTrackingSchema = z.object({
	trackingStatus: z.enum(TrackingStatus).optional(),
	resiNumber: z
		.array(z.string().trim().min(1, "Nomor resi tidak boleh kosong"))
		.optional(),
	whName: z.string().trim().nullable().optional(),
	boxNo: z.string().trim().nullable().optional(),
	description: z.string().trim().nullable().optional(),
	checkedOut: z.boolean().optional(),
	uploadedToAlbum: z.boolean().optional(),
	notes: z.string().trim().nullable().optional(),
	isArchived: z.boolean().optional(),
});

export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;

export const getTrackingQuerySchema = z.object({
	countryCode: emptyStringToUndefined(z.enum(CountryCode).optional()),
	trackingStatus: emptyStringToUndefined(z.enum(TrackingStatus).optional()),
	whName: emptyStringToUndefined(z.string().trim().optional()),
	search: emptyStringToUndefined(z.string().trim().optional()),
	tab: emptyStringToUndefined(
		z.enum(["active", "archived", "done", "all"]).optional(),
	),
	isArchived: emptyStringToUndefined(
		z
			.union([z.boolean(), z.enum(["true", "false"])])
			.transform((val) => val === true || val === "true")
			.optional(),
	),
	page: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
	limit: emptyStringToUndefined(z.coerce.number().int().positive().optional()),
});

export type GetTrackingQueryInput = z.infer<typeof getTrackingQuerySchema>;
