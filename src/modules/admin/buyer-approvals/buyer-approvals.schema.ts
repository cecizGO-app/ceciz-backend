import { z } from "zod";
import { LineGroup, VerificationStatus } from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const getBuyerApprovalsQuerySchema = z.object({
	status: emptyStringToUndefined(z.enum(VerificationStatus).optional()),
	lineGroup: emptyStringToUndefined(z.enum(LineGroup).optional()),
	search: emptyStringToUndefined(z.string().trim().optional()),
	page: emptyStringToUndefined(z.coerce.number().int().min(1).default(1)),
	limit: emptyStringToUndefined(
		z.coerce.number().int().min(1).max(100).default(20),
	),
});

export type GetBuyerApprovalsQueryInput = z.infer<
	typeof getBuyerApprovalsQuerySchema
>;

export const verifyBuyerApprovalSchema = z.object({
	status: z.enum(["APPROVED", "REJECTED"], {
		message: "Status harus APPROVED atau REJECTED",
	}),
	rejectReason: z.string().trim().max(500).optional(),
});

export type VerifyBuyerApprovalInput = z.infer<
	typeof verifyBuyerApprovalSchema
>;

export const bulkVerifyBuyerApprovalsSchema = z.object({
	buyerIds: z
		.array(z.string().min(1))
		.min(1, "Minimal pilih 1 buyer untuk diverifikasi"),
	status: z.enum(["APPROVED", "REJECTED"], {
		message: "Status harus APPROVED atau REJECTED",
	}),
	rejectReason: z.string().trim().max(500).optional(),
});

export type BulkVerifyBuyerApprovalsInput = z.infer<
	typeof bulkVerifyBuyerApprovalsSchema
>;
