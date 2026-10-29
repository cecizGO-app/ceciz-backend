import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { SubscribePushInput } from "./push.schema.js";

export function getVapidPublicKey() {
	return { vapid_public_key: process.env.VAPID_PUBLIC_KEY ?? "" };
}

export async function subscribePush(buyerId: string, input: SubscribePushInput) {
	const subscription = await prisma.pushSubscription.upsert({
		where: { endpoint: input.endpoint },
		create: {
			buyerId,
			endpoint: input.endpoint,
			p256dh: input.p256dh,
			auth: input.auth,
			userAgent: input.user_agent ?? null,
		},
		update: {
			buyerId,
			p256dh: input.p256dh,
			auth: input.auth,
			userAgent: input.user_agent ?? null,
		},
		select: {
			id: true,
			buyerId: true,
			endpoint: true,
			p256dh: true,
			auth: true,
			userAgent: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	return {
		id: subscription.id,
		buyer_id: subscription.buyerId,
		endpoint: subscription.endpoint,
		p256dh: subscription.p256dh,
		auth: subscription.auth,
		user_agent: subscription.userAgent,
		created_at: subscription.createdAt,
		updated_at: subscription.updatedAt,
	};
}

export async function unsubscribePush(buyerId: string, endpoint: string) {
	const existing = await prisma.pushSubscription.findFirst({
		where: { endpoint, buyerId },
	});

	if (!existing) {
		throw new AppError(
			404,
			"PUSH_SUBSCRIPTION_NOT_FOUND",
			"Push subscription tidak ditemukan",
		);
	}

	await prisma.pushSubscription.delete({
		where: { endpoint },
	});

	return { success: true };
}
