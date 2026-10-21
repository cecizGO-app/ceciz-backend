import { z } from "zod";
import { InvoiceStatus } from "@/generated/prisma/enums";
import { paginationSchema } from "@/lib/pagination";

export const getInvoicesQuerySchema = paginationSchema.extend({
	status: z.enum(InvoiceStatus).optional(),
	batch_id: z.string().optional(),
});

export type GetInvoicesQuery = z.infer<typeof getInvoicesQuerySchema>;
