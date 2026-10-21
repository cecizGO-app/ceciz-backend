import type { Request, Response } from "express";
import { sendError } from "@/lib/response";

export function notFound(_req: Request, res: Response) {
	return sendError(res, 404, "NOT_FOUND", "Route tidak ditemukan");
}
