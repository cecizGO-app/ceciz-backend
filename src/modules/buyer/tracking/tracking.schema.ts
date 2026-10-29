import { z } from "zod";
import { paginationSchema } from "@/lib/pagination";

export const getTrackingQuerySchema = paginationSchema;
export type GetTrackingQuery = z.infer<typeof getTrackingQuerySchema>;
