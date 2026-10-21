import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { sendError } from "../lib/response.js";

type ValidateTarget = "body" | "query" | "params";

/**
 * Zod validation middleware factory.
 * Usage: validate("body", mySchema)
 */
export function validate<T>(target: ValidateTarget, schema: ZodSchema<T>) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req[target]);
		if (!result.success) {
			const details = result.error.issues.map((issue) => ({
				field: issue.path.join("."),
				message: issue.message,
			}));
			return sendError(res, 400, "VALIDATION_ERROR", "Validasi gagal", details);
		}
		// Overwrite with parsed (and possibly defaulted) value
		(req as unknown as Record<string, unknown>)[target] = result.data;
		next();
	};
}
