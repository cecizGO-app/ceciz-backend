import { z } from "zod";
import { CountryCode } from "@/generated/prisma/enums";
import { paginationSchema } from "@/lib/pagination";

export const getBuyerBatchesQuerySchema = paginationSchema.extend({
	country_code: z.enum(CountryCode).optional(),
});

export type GetBuyerBatchesQuery = z.infer<typeof getBuyerBatchesQuerySchema>;
