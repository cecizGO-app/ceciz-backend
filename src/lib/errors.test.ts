/**
 * Unit tests for AppError class.
 */
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";

describe("AppError", () => {
	it("creates an unauthorized error with correct status", () => {
		const err = AppError.unauthorized();
		expect(err.statusCode).toBe(401);
		expect(err.code).toBe("UNAUTHORIZED");
		expect(err.isOperational).toBe(true);
	});

	it("creates a forbidden error", () => {
		const err = AppError.forbidden("No access");
		expect(err.statusCode).toBe(403);
		expect(err.code).toBe("FORBIDDEN");
		expect(err.message).toBe("No access");
	});

	it("creates a not found error", () => {
		const err = AppError.notFound("Invoice tidak ditemukan");
		expect(err.statusCode).toBe(404);
		expect(err.code).toBe("NOT_FOUND");
	});

	it("creates a conflict error", () => {
		const err = AppError.conflict("BATCH_CLOSED", "Batch sudah ditutup");
		expect(err.statusCode).toBe(409);
		expect(err.code).toBe("BATCH_CLOSED");
	});

	it("creates a bad request error", () => {
		const err = AppError.badRequest("Field wajib diisi", [{ field: "name" }]);
		expect(err.statusCode).toBe(400);
		expect(err.code).toBe("VALIDATION_ERROR");
		expect(err.details).toHaveLength(1);
	});

	it("instanceof Error is true", () => {
		const err = AppError.notFound();
		expect(err instanceof Error).toBe(true);
		expect(err instanceof AppError).toBe(true);
	});
});
