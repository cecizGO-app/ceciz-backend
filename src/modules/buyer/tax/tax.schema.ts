import { z } from "zod";
import { TaxInvoiceStatus } from "../../../generated/prisma/enums.js";
import { paginationSchema } from "../../../lib/pagination.js";

export const getTaxInvoicesQuerySchema = paginationSchema.extend({
	status: z.nativeEnum(TaxInvoiceStatus).optional(),
});

export const uploadTaxPaymentSchema = z
	.object({
		amount: z.coerce.number().int().min(1),
		payment_method: z.enum(["BCA", "QRIS", "SEABANK", "SPAY"]),
		payment_date: z.coerce.date(),
	})
	.strict();

export type GetTaxInvoicesQuery = z.infer<typeof getTaxInvoicesQuerySchema>;
export type UploadTaxPaymentInput = z.infer<typeof uploadTaxPaymentSchema>;
