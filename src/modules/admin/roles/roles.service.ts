import type { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
	CreateStaffInput,
	UpdateRolePermissionsInput,
	UpdateStaffInput,
} from "./roles.schema.js";

const DEFAULT_ROLE_MATRICES = [
	{
		roleKey: "OPERATIONS_STAFF",
		label: "Operations Staff",
		permissions: {
			batch: { view: true, create: true, edit: true, delete: false },
			calculation: { view: true, create: true, edit: true, delete: false },
			paymentVerification: {
				view: true,
				create: true,
				edit: true,
				delete: true,
			},
			approvalBuyer: { view: true, create: true, edit: true, delete: false },
			tracking: { view: true, create: true, edit: true, delete: false },
			tax: { view: true, create: true, edit: true, delete: false },
			poCo: { view: true, create: true, edit: true, delete: false },
			cashflow: { view: false, create: false, edit: false, delete: false },
			reports: { view: false, create: false, edit: false, delete: false },
			settings: { view: false, create: false, edit: false, delete: false },
		},
	},
	{
		roleKey: "FINANCE_STAFF",
		label: "Finance Staff",
		permissions: {
			batch: { view: true, create: false, edit: false, delete: false },
			calculation: { view: true, create: false, edit: false, delete: false },
			paymentVerification: {
				view: true,
				create: true,
				edit: true,
				delete: false,
			},
			approvalBuyer: { view: true, create: false, edit: false, delete: false },
			tracking: { view: true, create: false, edit: false, delete: false },
			tax: { view: true, create: true, edit: true, delete: false },
			poCo: { view: true, create: true, edit: true, delete: false },
			cashflow: { view: false, create: false, edit: false, delete: false },
			reports: { view: false, create: false, edit: false, delete: false },
			settings: { view: false, create: false, edit: false, delete: false },
		},
	},
];

function formatStaffUser(user: {
	id: string;
	name: string;
	email: string;
	role: Role;
	staffTitle: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	sessions?: Array<{ updatedAt: Date }>;
}) {
	return {
		id: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		staffTitle:
			user.role === Role.OWNER
				? "Owner"
				: (user.staffTitle ?? "Operations Staff"),
		isActive: user.isActive,
		lastActiveAt: user.sessions?.[0]?.updatedAt ?? user.updatedAt,
		createdAt: user.createdAt,
	};
}

// ==========================================
// 1. Staff Accounts
// ==========================================

export async function getStaffAccounts() {
	const users = await prisma.user.findMany({
		where: { role: { in: [Role.OWNER, Role.STAFF] } },
		orderBy: [{ role: "asc" }, { createdAt: "asc" }],
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			staffTitle: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
			sessions: {
				orderBy: { updatedAt: "desc" },
				take: 1,
				select: { updatedAt: true },
			},
		},
	});

	return users.map(formatStaffUser);
}

export async function createStaffAccount(input: CreateStaffInput) {
	const existing = await prisma.user.findUnique({
		where: { email: input.email },
		select: { id: true },
	});

	if (existing) {
		throw AppError.conflict("CONFLICT", "Email sudah terdaftar");
	}

	const created = await prisma.user.create({
		data: {
			id: `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
			name: input.name,
			email: input.email,
			role: input.role,
			staffTitle: input.role === Role.OWNER ? "Owner" : input.staffTitle,
			isActive: input.isActive,
			isOnboarded: true,
			emailVerified: true,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			staffTitle: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return formatStaffUser(created);
}

export async function updateStaffAccount(id: string, input: UpdateStaffInput) {
	const existing = await prisma.user.findUnique({
		where: { id },
		select: { id: true, role: true },
	});

	if (!existing || existing.role === Role.BUYER) {
		throw AppError.notFound("Akun staff tidak ditemukan");
	}

	const updated = await prisma.user.update({
		where: { id },
		data: {
			...(input.name !== undefined && { name: input.name }),
			...(input.role !== undefined && { role: input.role }),
			...(input.staffTitle !== undefined && { staffTitle: input.staffTitle }),
			...(input.isActive !== undefined && { isActive: input.isActive }),
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			staffTitle: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return formatStaffUser(updated);
}

export async function deleteStaffAccount(id: string, currentUserId?: string) {
	if (id === currentUserId) {
		throw AppError.badRequest("Tidak dapat menghapus akun sendiri");
	}

	const existing = await prisma.user.findUnique({
		where: { id },
		select: { id: true, role: true },
	});

	if (!existing || existing.role === Role.BUYER) {
		throw AppError.notFound("Akun staff tidak ditemukan");
	}

	if (existing.role === Role.OWNER) {
		throw AppError.forbidden("Akun Owner tidak dapat dihapus");
	}

	await prisma.user.delete({ where: { id } });
	return { id, deleted: true };
}

// ==========================================
// 2. Permission Matrix
// ==========================================

export async function getRolePermissions() {
	let existing = await prisma.rolePermission.findMany({
		orderBy: { createdAt: "asc" },
	});

	if (existing.length === 0) {
		await Promise.all(
			DEFAULT_ROLE_MATRICES.map((m) =>
				prisma.rolePermission.upsert({
					where: { roleKey: m.roleKey },
					update: {},
					create: {
						roleKey: m.roleKey,
						label: m.label,
						permissions: m.permissions as Prisma.InputJsonValue,
					},
				}),
			),
		);

		existing = await prisma.rolePermission.findMany({
			orderBy: { createdAt: "asc" },
		});
	}

	return existing.map((r) => ({
		roleKey: r.roleKey,
		label: r.label,
		permissions: r.permissions,
		updatedAt: r.updatedAt,
	}));
}

export async function updateRolePermissions(input: UpdateRolePermissionsInput) {
	const updated = await prisma.rolePermission.upsert({
		where: { roleKey: input.roleKey },
		update: {
			...(input.label !== undefined && { label: input.label }),
			permissions: input.permissions as unknown as Prisma.InputJsonValue,
		},
		create: {
			roleKey: input.roleKey,
			label: input.label ?? input.roleKey,
			permissions: input.permissions as unknown as Prisma.InputJsonValue,
		},
	});

	return {
		roleKey: updated.roleKey,
		label: updated.label,
		permissions: updated.permissions,
		updatedAt: updated.updatedAt,
	};
}
