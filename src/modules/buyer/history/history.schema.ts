import { z } from "zod";
import { paginationSchema } from "@/lib/pagination";

export const getHistoryQuerySchema = paginationSchema;
export type GetHistoryQuery = z.infer<typeof getHistoryQuerySchema>;
