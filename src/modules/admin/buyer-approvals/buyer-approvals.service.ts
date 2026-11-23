import type { Prisma } from "@/generated/prisma/client";
import { LineGroup, Role, VerificationStatus } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type {
	BulkVerifyBuyerApprovalsInput,
	GetBuyerApprovalsQueryInput,
	VerifyBuyerApprovalInput,
} from "./buyer-approvals.schema.js";

const buyerApprovalSelect = {
	id: true,
	name: true,
	email: true,
	idLine: true,
	lineGroup: true,
	approvalStatus: true,
	approvalRejectReason: true,
	approvalSubmittedAt: true,
	approvedAt: true,
	approvedBy: true,
	isActive: true,
	isOnboarded: true,
	createdAt: true,
	updatedAt: true,
} satisfies Prisma.UserSelect;

export async function getBuyerApprovalStats() {
	const [pendingCount, approvedCount, rejectedCount, activeGroupMembersCount] =
		await Promise.all([
			prisma.user.count({
				where: {
					role: Role.BUYER,
					approvalStatus: VerificationStatus.PENDING,
				},
			}),
			prisma.user.count({
				where: {
					role: Role.BUYER,
					approvalStatus: VerificationStatus.APPROVED,
				},
			}),
			prisma.user.count({
				where: {
					role: Role.BUYER,
					approvalStatus: VerificationStatus.REJECTED,
				},
			}),
			prisma.user.count({
				where: {
					role: Role.BUYER,
					approvalStatus: VerificationStatus.APPROVED,
					isActive: true,
					lineGroup: { in: [LineGroup.GO_1, LineGroup.GO_2] },
				},
			}),
		]);

	const totalAll = pendingCount + approvedCount + rejectedCount;

	return {
		menungguPersetujuan: {
			count: pendingCount,
		},
		akunDisetujui: {
			count: approvedCount,
		},
		pengajuanDitolak: {
			count: rejectedCount,
		},
		totalMemberAktif: {
			count: activeGroupMembersCount,
		},
		tabCounts: {
			pending: pendingCount,
			approved: approvedCount,
			rejected: rejectedCount,
			all: totalAll,
		},
	};
}

export async function getBuyerApprovals(query: GetBuyerApprovalsQueryInput) {
	const andConditions: Prisma.UserWhereInput[] = [{ role: Role.BUYER }];

	if (query.status) {
		andConditions.push({ approvalStatus: query.status });
	}

	if (query.lineGroup) {
		andConditions.push({ lineGroup: query.lineGroup });
	}

	if (query.search) {
		andConditions.push({
			OR: [
				{ name: { contains: query.search, mode: "insensitive" } },
				{ idLine: { contains: query.search, mode: "insensitive" } },
				{ email: { contains: query.search, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.UserWhereInput = { AND: andConditions };
	const { skip, take } = getPaginationArgs({
		page: query.page,
		limit: query.limit,
	});

	const [total, buyers] = await Promise.all([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			select: buyerApprovalSelect,
			orderBy: [{ approvalSubmittedAt: "desc" }, { createdAt: "desc" }],
			skip,
			take,
		}),
	]);

	const data = buyers.map((buyer) => ({
		...buyer,
		waktuPengajuan: buyer.approvalSubmittedAt ?? buyer.createdAt,
	}));

	return {
		data,
		pagination: buildMeta(total, query.page, query.limit),
	};
}

export async function verifyBuyerApproval(
	buyerId: string,
	input: VerifyBuyerApprovalInput,
	adminId?: string,
) {
	const existing = await prisma.user.findFirst({
		where: { id: buyerId, role: Role.BUYER },
		select: { id: true },
	});

	if (!existing) {
		throw AppError.notFound("Akun buyer tidak ditemukan");
	}

	const isRejected = input.status === VerificationStatus.REJECTED;

	const updated = await prisma.user.update({
		where: { id: buyerId },
		data: {
			approvalStatus: input.status,
			approvalRejectReason: isRejected ? (input.rejectReason ?? null) : null,
			approvedAt: new Date(),
			approvedBy: adminId ?? null,
		},
		select: buyerApprovalSelect,
	});

	return {
		...updated,
		waktuPengajuan: updated.approvalSubmittedAt ?? updated.createdAt,
	};
}

export async function bulkVerifyBuyerApprovals(
	input: BulkVerifyBuyerApprovalsInput,
	adminId?: string,
) {
	const isRejected = input.status === VerificationStatus.REJECTED;

	const result = await prisma.user.updateMany({
		where: {
			id: { in: input.buyerIds },
			role: Role.BUYER,
		},
		data: {
			approvalStatus: input.status,
			approvalRejectReason: isRejected ? (input.rejectReason ?? null) : null,
			approvedAt: new Date(),
			approvedBy: adminId ?? null,
		},
	});

	if (result.count === 0) {
		throw AppError.notFound("Tidak ada akun buyer yang ditemukan");
	}

	return {
		updatedCount: result.count,
		status: input.status,
	};
}
