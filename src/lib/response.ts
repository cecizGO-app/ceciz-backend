import type { Response } from "express";

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface SuccessResponse<T> {
	success: true;
	data: T;
	meta?: PaginationMeta;
}

export interface ErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
		details?: unknown[];
	};
}

export function sendSuccess<T>(
	res: Response,
	data: T,
	statusCode = 200,
	meta?: PaginationMeta,
) {
	const body: SuccessResponse<T> = { success: true, data };
	if (meta) body.meta = meta;
	return res.status(statusCode).json(body);
}

export function sendCreated<T>(res: Response, data: T) {
	return sendSuccess(res, data, 201);
}

export function sendError(
	res: Response,
	statusCode: number,
	code: string,
	message: string,
	details?: unknown[],
) {
	const body: ErrorResponse = {
		success: false,
		error: { code, message, ...(details?.length ? { details } : {}) },
	};
	return res.status(statusCode).json(body);
}
