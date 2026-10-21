import { z } from "zod";
import { OrderStatus } from "../../../generated/prisma/enums.js";
import { paginationSchema } from "../../../lib/pagination.js";

export const createOrderSchema = z
	.object({
		batch_id: z.string().min(1),
		item_qty: z.number().int().min(1),
	})
	.strict();

export const getOrdersQuerySchema = paginationSchema.extend({
	status: z.enum(OrderStatus).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type GetOrdersQuery = z.infer<typeof getOrdersQuerySchema>;
