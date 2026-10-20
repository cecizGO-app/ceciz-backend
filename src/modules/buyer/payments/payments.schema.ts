import { z } from "zod";
import { PaymentMethod } from "../../../generated/prisma/enums.js";

export const uploadPaymentSchema = z
	.object({
		amount: z.coerce.number().int().min(1),
		payment_method: z.enum(["BCA", "QRIS", "SEABANK", "SPAY"]),
		payment_date: z.coerce.date(),
	})
	.strict();

export type UploadPaymentInput = z.infer<typeof uploadPaymentSchema>;
