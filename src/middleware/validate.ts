import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { sendError } from "@/lib/response";

type ValidateTarget = "body" | "query" | "params";

/**
 * Zod validation middleware factory.
 * Usage: validate("body", mySchema)
 */
export function validate(target: ValidateTarget, schema: ZodType) {
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
