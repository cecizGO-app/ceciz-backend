import { z } from "zod";
import { InvoiceStatus } from "../../../generated/prisma/enums.js";
import { paginationSchema } from "../../../lib/pagination.js";

export const getInvoicesQuerySchema = paginationSchema.extend({
	status: z.nativeEnum(InvoiceStatus).optional(),
	batch_id: z.string().optional(),
});

export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;
