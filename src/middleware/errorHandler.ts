import type { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../lib/errors.js";
import { sendError } from "../lib/response.js";

const isProd = process.env.NODE_ENV === "production";

/**
 * Global error handler — must be registered last in the middleware chain.
 */
export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	_next: NextFunction,
) {
	if (err instanceof AppError) {
		return sendError(res, err.statusCode, err.code, err.message, err.details);
	}

	if (err instanceof MulterError) {
		return sendError(res, 400, "VALIDATION_ERROR", err.message);
	}

	// Unknown / unexpected errors
	console.error("[Unhandled Error]", err);

	return sendError(
		res,
		500,
		"INTERNAL_SERVER_ERROR",
		isProd ? "Terjadi kesalahan pada server" : String(err),
	);
}
