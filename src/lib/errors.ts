export type ErrorCode =
	| "UNAUTHORIZED"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "VALIDATION_ERROR"
	| "CONFLICT"
	| "BATCH_CLOSED"
	| "BATCH_NOT_FOUND"
	| "ORDER_NOT_FOUND"
	| "INVOICE_NOT_FOUND"
	| "INVOICE_NOT_AVAILABLE"
	| "PAYMENT_NOT_FOUND"
	| "PAYMENT_ALREADY_PENDING"
	| "PAYMENT_ALREADY_APPROVED"
	| "PAYMENT_DATE_FUTURE"
	| "INVOICE_ALREADY_PAID"
	| "TAX_INVOICE_NOT_FOUND"
	| "TAX_PAYMENT_ALREADY_PENDING"
	| "EMAIL_REJECTED"
	| "UPLOAD_INVALID_MIME"
	| "UPLOAD_TOO_LARGE"
	| "TRACKING_NOT_FOUND"
	| "NOTIFICATION_NOT_FOUND"
	| "PUSH_SUBSCRIPTION_NOT_FOUND"
	| "INTERNAL_AUTH_FAILED"
	| "INTERNAL_SERVER_ERROR"
	| "RATE_LIMIT_EXCEEDED";

export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: ErrorCode;
	public readonly details: unknown[];
	public readonly isOperational: boolean;

	constructor(
		statusCode: number,
		code: ErrorCode,
		message: string,
		details: unknown[] = [],
	) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
		this.isOperational = true;
		Object.setPrototypeOf(this, new.target.prototype);
	}

	static unauthorized(message = "Silahkan login terlebih dahulu") {
		return new AppError(401, "UNAUTHORIZED", message);
	}

	static forbidden(message = "Akses ditolak") {
		return new AppError(403, "FORBIDDEN", message);
	}

	static notFound(message = "Data tidak ditemukan") {
		return new AppError(404, "NOT_FOUND", message);
	}

	static conflict(code: ErrorCode, message: string) {
		return new AppError(409, code, message);
	}

	static badRequest(message: string, details: unknown[] = []) {
		return new AppError(400, "VALIDATION_ERROR", message, details);
	}
}
