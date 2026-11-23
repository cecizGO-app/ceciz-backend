import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import type { GetActivityLogsQueryInput } from "./dashboard.schema.js";
import * as dashboardService from "./dashboard.service.js";

export async function handleGetRecentActivities(req: Request, res: Response) {
	const query = req.query as unknown as GetActivityLogsQueryInput;
	const result = await dashboardService.getRecentActivities(query.limit);
	return sendSuccess(res, result);
}
