import { z } from "zod";

export const getActivityLogsQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type GetActivityLogsQueryInput = z.infer<
	typeof getActivityLogsQuerySchema
>;
