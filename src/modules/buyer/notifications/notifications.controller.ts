import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import {
	getNotifications,
	getUnreadCount,
	markAllAsRead,
	markAsRead,
} from "./notifications.service.js";
import type { GetNotificationsQuery } from "./notifications.schema.js";

export async function handleGetNotifications(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getNotifications(
		buyerId,
		req.query as unknown as GetNotificationsQuery,
	);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetUnreadCount(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getUnreadCount(buyerId);
	return sendSuccess(res, result);
}

export async function handleMarkAsRead(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const notifId = req.params.id as string;
	const result = await markAsRead(buyerId, notifId);
	return sendSuccess(res, result);
}

export async function handleMarkAllAsRead(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await markAllAsRead(buyerId);
	return sendSuccess(res, result);
}
