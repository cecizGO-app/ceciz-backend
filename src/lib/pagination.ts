import { z } from "zod";

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function getPaginationArgs(input: PaginationInput) {
	const skip = (input.page - 1) * input.limit;
	const take = input.limit;
	return { skip, take };
}

export function buildMeta(total: number, page: number, limit: number) {
	return {
		page,
		limit,
		total,
		totalPages: Math.ceil(total / limit),
	};
}
