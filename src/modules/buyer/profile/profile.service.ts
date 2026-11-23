import { VerificationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { UpdateProfileInput } from "./profile.schema.js";

const profileSelect = {
	id: true,
	name: true,
	email: true,
	image: true,
	contact: true,
	idLine: true,
	lineGroup: true,
	address: true,
	isOnboarded: true,
	approvalStatus: true,
	approvalRejectReason: true,
	approvalSubmittedAt: true,
	approvedAt: true,
	role: true,
	createdAt: true,
} as const;

export async function getProfile(buyerId: string) {
	return prisma.user.findUniqueOrThrow({
		where: { id: buyerId },
		select: profileSelect,
	});
}

export async function updateProfile(buyerId: string, data: UpdateProfileInput) {
	const existing = await prisma.user.findUniqueOrThrow({
		where: { id: buyerId },
		select: {
			approvalStatus: true,
			approvalSubmittedAt: true,
			idLine: true,
			lineGroup: true,
		},
	});

	const idLineChanged =
		data.idLine !== undefined && data.idLine !== existing.idLine;
	const lineGroupChanged =
		data.lineGroup !== undefined && data.lineGroup !== existing.lineGroup;
	const hasVerificationUpdate = idLineChanged || lineGroupChanged;
	const shouldResubmit =
		(existing.approvalStatus === VerificationStatus.REJECTED ||
			existing.approvalStatus === VerificationStatus.APPROVED) &&
		hasVerificationUpdate;

	return prisma.user.update({
		where: { id: buyerId },
		data: {
			...(data.name !== undefined && { name: data.name }),
			...(data.contact !== undefined && { contact: data.contact }),
			...(data.idLine !== undefined && { idLine: data.idLine }),
			...(data.lineGroup !== undefined && { lineGroup: data.lineGroup }),
			...(data.address !== undefined && { address: data.address }),
			...(shouldResubmit && {
				approvalStatus: VerificationStatus.PENDING,
				approvalRejectReason: null,
				approvalSubmittedAt: new Date(),
			}),
			...(!shouldResubmit &&
				!existing.approvalSubmittedAt &&
				(data.idLine !== undefined || data.lineGroup !== undefined) && {
					approvalSubmittedAt: new Date(),
				}),
		},
		select: profileSelect,
	});
}

export async function setOnboarded(buyerId: string) {
	return prisma.user.update({
		where: { id: buyerId },
		data: { isOnboarded: true },
		select: { id: true, isOnboarded: true },
	});
}
