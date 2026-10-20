import type { Request, Response } from "express";
import { AppError } from "../../../lib/errors.js";
import { sendCreated, sendSuccess } from "../../../lib/response.js";
import { createOrder, getOrderById, getOrders } from "./orders.service.js";

export async function handleCreateOrder(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await createOrder(buyerId, req.body);
	return sendCreated(res, result);
}

export async function handleGetOrders(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const result = await getOrders(buyerId, req.query as never);
	return sendSuccess(res, result.data, 200, result.meta);
}

export async function handleGetOrderById(req: Request, res: Response) {
	const buyerId = req.user!.id;
	const order = await getOrderById(buyerId, req.params.id);
	if (!order) throw AppError.notFound("Order tidak ditemukan");
	return sendSuccess(res, order);
}
