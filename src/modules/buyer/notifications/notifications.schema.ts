import { z } from "zod";
import { paginationSchema } from "@/lib/pagination";

export const getNotificationsQuerySchema = paginationSchema.extend({
	is_read: z.enum(["true", "false"]).optional(),
});
export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>;
