import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type { GetNotificationsQuery } from "./notifications.schema.js";

export async function getNotifications(
	buyerId: string,
	query: GetNotificationsQuery,
) {
	const { skip, take } = getPaginationArgs(query);

	const isRead =
		query.is_read === "true"
			? true
			: query.is_read === "false"
				? false
				: undefined;

	const where = {
		buyerId,
		...(isRead !== undefined && { isRead }),
	};

	const [notifications, total] = await Promise.all([
		prisma.notification.findMany({
			where,
			skip,
			take,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				channel: true,
				type: true,
				title: true,
				body: true,
				triggeredByEvent: true,
				referenceId: true,
				isRead: true,
				createdAt: true,
			},
		}),
		prisma.notification.count({ where }),
	]);

	const data = notifications.map((n) => ({
		id: n.id,
		channel: n.channel,
		type: n.type,
		title: n.title,
		body: n.body,
		triggered_by_event: n.triggeredByEvent,
		reference_id: n.referenceId,
		is_read: n.isRead,
		created_at: n.createdAt,
	}));

	return { data, meta: buildMeta(total, query.page, query.limit) };
}

export async function getUnreadCount(buyerId: string) {
	const count = await prisma.notification.count({
		where: { buyerId, isRead: false },
	});
	return { unread_count: count };
}

export async function markAsRead(buyerId: string, notifId: string) {
	const notification = await prisma.notification.findFirst({
		where: { id: notifId, buyerId },
	});

	if (!notification) {
		throw new AppError(
			404,
			"NOTIFICATION_NOT_FOUND",
			"Notifikasi tidak ditemukan",
		);
	}

	const updated = await prisma.notification.update({
		where: { id: notifId },
		data: { isRead: true },
		select: {
			id: true,
			isRead: true,
		},
	});

	return updated;
}

export async function markAllAsRead(buyerId: string) {
	await prisma.notification.updateMany({
		where: { buyerId, isRead: false },
		data: { isRead: true },
	});
	return { success: true };
}
