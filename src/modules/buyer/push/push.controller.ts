import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import {
	getVapidPublicKey,
	subscribePush,
	unsubscribePush,
} from "./push.service.js";
import type { SubscribePushInput, UnsubscribePushInput } from "./push.schema.js";

export async function handleGetVapidPublicKey(_req: Request, res: Response) {
	const result = getVapidPublicKey();
	return sendSuccess(res, result);
}

export async function handleSubscribePush(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const input = req.body as SubscribePushInput;
	const result = await subscribePush(buyerId, input);
	return sendSuccess(res, result, 201);
}

export async function handleUnsubscribePush(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const { endpoint } = req.body as UnsubscribePushInput;
	const result = await unsubscribePush(buyerId, endpoint);
	return sendSuccess(res, result);
}
