import { z } from "zod";
import { CountryCode } from "../../../generated/prisma/enums.js";
import { paginationSchema } from "../../../lib/pagination.js";

export const getBuyerBatchesQuerySchema = paginationSchema.extend({
	country_code: z.nativeEnum(CountryCode).optional(),
});

export type GetBuyerBatchesQuery = z.infer<typeof getBuyerBatchesQuerySchema>;
