import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((val) => (val === "" ? undefined : val), schema);

export const createStaffSchema = z.object({
	name: z.string().trim().min(1, "Nama wajib diisi").max(100),
	email: z.string().trim().email("Format email tidak valid"),
	role: z.enum([Role.OWNER, Role.STAFF]).default(Role.STAFF),
	staffTitle: emptyStringToUndefined(
		z.string().trim().max(100).default("Operations Staff"),
	),
	isActive: z.boolean().default(true),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

export const updateStaffSchema = z.object({
	name: emptyStringToUndefined(z.string().trim().min(1).max(100).optional()),
	role: emptyStringToUndefined(z.enum([Role.OWNER, Role.STAFF]).optional()),
	staffTitle: emptyStringToUndefined(
		z.string().trim().max(100).nullable().optional(),
	),
	isActive: z.boolean().optional(),
});

export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const modulePermissionSchema = z.object({
	view: z.boolean(),
	create: z.boolean(),
	edit: z.boolean(),
	delete: z.boolean(),
});

export const updateRolePermissionsSchema = z.object({
	roleKey: z.string().trim().min(1, "roleKey wajib diisi"),
	label: emptyStringToUndefined(z.string().trim().max(100).optional()),
	permissions: z.record(z.string(), modulePermissionSchema),
});

export type UpdateRolePermissionsInput = z.infer<
	typeof updateRolePermissionsSchema
>;
