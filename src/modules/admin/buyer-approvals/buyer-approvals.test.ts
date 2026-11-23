import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineGroup, Role, VerificationStatus } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			count: vi.fn(),
			findMany: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
		},
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getBuyerApprovalStats,
	getBuyerApprovals,
	verifyBuyerApproval,
	bulkVerifyBuyerApprovals,
} = await import("./buyer-approvals.service.js");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Admin Buyer Approvals Service", () => {
	it("returns summary card counts and tab counts", async () => {
		vi.mocked(prisma.user.count)
			.mockResolvedValueOnce(2) // pending
			.mockResolvedValueOnce(2) // approved
			.mockResolvedValueOnce(1) // rejected
			.mockResolvedValueOnce(2); // active GO 1 & GO 2 members

		const stats = await getBuyerApprovalStats();

		expect(stats).toEqual({
			menungguPersetujuan: { count: 2 },
			akunDisetujui: { count: 2 },
			pengajuanDitolak: { count: 1 },
			totalMemberAktif: { count: 2 },
			tabCounts: {
				pending: 2,
				approved: 2,
				rejected: 1,
				all: 5,
			},
		});
	});

	it("lists buyer approvals with filters, search, and pagination", async () => {
		const submittedAt = new Date("2026-11-23T01:13:00Z");
		vi.mocked(prisma.user.count).mockResolvedValueOnce(1);
		vi.mocked(prisma.user.findMany).mockResolvedValueOnce([
			{
				id: "buyer-1",
				name: "Naya Azzahra",
				email: "naya.azzahra@gmail.com",
				idLine: "@naya_kpop",
				lineGroup: LineGroup.GO_1,
				approvalStatus: VerificationStatus.PENDING,
				approvalRejectReason: null,
				approvalSubmittedAt: submittedAt,
				approvedAt: null,
				approvedBy: null,
				isActive: true,
				isOnboarded: false,
				createdAt: submittedAt,
				updatedAt: submittedAt,
			},
		] as never);

		const result = await getBuyerApprovals({
			status: VerificationStatus.PENDING,
			lineGroup: LineGroup.GO_1,
			search: "naya",
			page: 1,
			limit: 20,
		});

		expect(prisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					AND: [
						{ role: Role.BUYER },
						{ approvalStatus: VerificationStatus.PENDING },
						{ lineGroup: LineGroup.GO_1 },
						{
							OR: [
								{ name: { contains: "naya", mode: "insensitive" } },
								{ idLine: { contains: "naya", mode: "insensitive" } },
								{ email: { contains: "naya", mode: "insensitive" } },
							],
						},
					],
				},
				skip: 0,
				take: 20,
			}),
		);
		expect(result.data).toHaveLength(1);
		expect(result.data[0]?.waktuPengajuan).toEqual(submittedAt);
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 1,
			totalPages: 1,
		});
	});

	it("approves a buyer account and clears rejectReason", async () => {
		const now = new Date("2026-11-23T02:00:00Z");
		vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
			id: "buyer-1",
		} as never);
		vi.mocked(prisma.user.update).mockResolvedValueOnce({
			id: "buyer-1",
			name: "Naya Azzahra",
			email: "naya.azzahra@gmail.com",
			idLine: "@naya_kpop",
			lineGroup: LineGroup.GO_1,
			approvalStatus: VerificationStatus.APPROVED,
			approvalRejectReason: null,
			approvalSubmittedAt: now,
			approvedAt: now,
			approvedBy: "admin-1",
			isActive: true,
			isOnboarded: false,
			createdAt: now,
			updatedAt: now,
		} as never);

		const res = await verifyBuyerApproval(
			"buyer-1",
			{ status: "APPROVED" },
			"admin-1",
		);

		expect(prisma.user.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "buyer-1" },
				data: expect.objectContaining({
					approvalStatus: "APPROVED",
					approvalRejectReason: null,
					approvedBy: "admin-1",
				}),
			}),
		);
		expect(res.approvalStatus).toBe(VerificationStatus.APPROVED);
	});

	it("throws NOT_FOUND when verifying unknown buyer", async () => {
		vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);

		await expect(
			verifyBuyerApproval("unknown-id", {
				status: "REJECTED",
				rejectReason: "ID LINE tidak ditemukan di grup",
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("bulk verifies buyer accounts", async () => {
		vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 2 });

		const res = await bulkVerifyBuyerApprovals(
			{
				buyerIds: ["buyer-1", "buyer-2"],
				status: "APPROVED",
			},
			"admin-1",
		);

		expect(prisma.user.updateMany).toHaveBeenCalledWith({
			where: {
				id: { in: ["buyer-1", "buyer-2"] },
				role: Role.BUYER,
			},
			data: expect.objectContaining({
				approvalStatus: "APPROVED",
				approvalRejectReason: null,
				approvedBy: "admin-1",
			}),
		});
		expect(res).toEqual({ updatedCount: 2, status: "APPROVED" });
	});
});
