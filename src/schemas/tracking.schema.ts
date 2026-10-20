import { z } from "zod";
import { CountryCode, TrackingStatus } from "../generated/prisma/enums.js";

export const updateTrackingSchema = z.object({
	trackingStatus: z.enum(TrackingStatus).optional(),
	resiNumber: z
		.array(z.string().trim().min(1, "Nomor resi tidak boleh kosong"))
		.optional(),
	whName: z.string().trim().optional(),
	boxNo: z.string().trim().optional(),
	description: z.string().trim().optional(),
	checkedOut: z.boolean().optional(),
	uploadedToAlbum: z.boolean().optional(),
	notes: z.string().trim().optional(),
});

export type UpdateTrackingInput = z.infer<typeof updateTrackingSchema>;

export const getTrackingQuerySchema = z.object({
	countryCode: z.enum(CountryCode).optional(),
	trackingStatus: z.enum(TrackingStatus).optional(),
	whName: z.string().trim().optional(),
	search: z.string().trim().optional(),
});

export type GetTrackingQueryInput = z.infer<typeof getTrackingQuerySchema>;
