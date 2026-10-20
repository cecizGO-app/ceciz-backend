import { prisma } from "../../../lib/prisma.js";
import type { UpdateProfileInput } from "./profile.schema.js";

export async function getProfile(buyerId: string) {
	return prisma.user.findUniqueOrThrow({
		where: { id: buyerId },
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			contact: true,
			address: true,
			isOnboarded: true,
			role: true,
			createdAt: true,
		},
	});
}

export async function updateProfile(buyerId: string, data: UpdateProfileInput) {
	return prisma.user.update({
		where: { id: buyerId },
		data: {
			...(data.name !== undefined && { name: data.name }),
			...(data.contact !== undefined && { contact: data.contact }),
			...(data.address !== undefined && { address: data.address }),
		},
		select: {
			id: true,
			name: true,
			email: true,
			image: true,
			contact: true,
			address: true,
			isOnboarded: true,
		},
	});
}

export async function setOnboarded(buyerId: string) {
	return prisma.user.update({
		where: { id: buyerId },
		data: { isOnboarded: true },
		select: { id: true, isOnboarded: true },
	});
}
