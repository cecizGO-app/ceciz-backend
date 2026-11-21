import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
	prisma: {
		user: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		rolePermission: {
			findMany: vi.fn(),
			create: vi.fn(),
			upsert: vi.fn(),
		},
	},
}));

const { prisma } = await import("@/lib/prisma");
const {
	getStaffAccounts,
	createStaffAccount,
	updateStaffAccount,
	deleteStaffAccount,
	getRolePermissions,
	updateRolePermissions,
} = await import("./roles.service.js");

beforeEach(() => {
	vi.clearAllMocks();
});

describe("Staff Accounts", () => {
	it("lists internal staff with lastActiveAt", async () => {
		const lastActive = new Date("2026-11-21T10:00:00Z");
		vi.mocked(prisma.user.findMany).mockResolvedValue([
			{
				id: "u-1",
				name: "Nadia Azahra",
				email: "nadia@cecizgo.id",
				role: Role.OWNER,
				staffTitle: null,
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
				sessions: [{ updatedAt: lastActive }],
			},
		] as never);

		const res = await getStaffAccounts();
		expect(res[0]?.staffTitle).toBe("Owner");
		expect(res[0]?.lastActiveAt).toEqual(lastActive);
	});

	it("creates staff account and rejects duplicate email", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
			id: "existing",
		} as never);
		await expect(
			createStaffAccount({
				name: "Salsa",
				email: "salsa@cecizgo.id",
				role: Role.STAFF,
				staffTitle: "Operations Staff",
				isActive: true,
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });

		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
		vi.mocked(prisma.user.create).mockResolvedValue({
			id: "staff_1",
			name: "Salsa",
			email: "salsa@cecizgo.id",
			role: Role.STAFF,
			staffTitle: "Operations Staff",
			isActive: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never);

		const created = await createStaffAccount({
			name: "Salsa",
			email: "salsa@cecizgo.id",
			role: Role.STAFF,
			staffTitle: "Operations Staff",
			isActive: true,
		});
		expect(created.staffTitle).toBe("Operations Staff");
	});

	it("updates staff account and prevents deleting owner or self", async () => {
		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
			id: "staff_1",
			role: Role.STAFF,
		} as never);
		vi.mocked(prisma.user.update).mockResolvedValue({
			id: "staff_1",
			name: "Salsa",
			email: "salsa@cecizgo.id",
			role: Role.STAFF,
			staffTitle: "Finance Staff",
			isActive: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		} as never);

		const updated = await updateStaffAccount("staff_1", {
			staffTitle: "Finance Staff",
			isActive: false,
		});
		expect(updated.isActive).toBe(false);

		await expect(deleteStaffAccount("u-1", "u-1")).rejects.toMatchObject({
			code: "VALIDATION_ERROR",
		});

		vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
			id: "u-1",
			role: Role.OWNER,
		} as never);
		await expect(deleteStaffAccount("u-1", "u-2")).rejects.toMatchObject({
			code: "FORBIDDEN",
		});
	});
});

describe("Permission Matrix", () => {
	it("upserts default matrices only when empty and returns sorted list", async () => {
		vi.mocked(prisma.rolePermission.upsert).mockResolvedValue({} as never);
		vi.mocked(prisma.rolePermission.findMany)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([
				{
					roleKey: "OPERATIONS_STAFF",
					label: "Operations Staff",
					permissions: {},
					updatedAt: new Date(),
				},
				{
					roleKey: "FINANCE_STAFF",
					label: "Finance Staff",
					permissions: {},
					updatedAt: new Date(),
				},
			] as never);

		const list = await getRolePermissions();
		expect(list).toHaveLength(2);
		expect(prisma.rolePermission.upsert).toHaveBeenCalledTimes(2);

		vi.mocked(prisma.rolePermission.upsert).mockResolvedValue({
			roleKey: "OPERATIONS_STAFF",
			label: "Operations Staff",
			permissions: {
				batch: { view: true, create: true, edit: true, delete: true },
			},
			updatedAt: new Date(),
		} as never);

		const updated = await updateRolePermissions({
			roleKey: "OPERATIONS_STAFF",
			permissions: {
				batch: { view: true, create: true, edit: true, delete: true },
			},
		});
		expect(updated.roleKey).toBe("OPERATIONS_STAFF");
	});
});
