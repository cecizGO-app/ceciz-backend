import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { validate } from "../../../middleware/validate.js";
import {
	handleCreateOrder,
	handleGetOrderById,
	handleGetOrders,
} from "./orders.controller.js";
import { createOrderSchema, getOrdersQuerySchema } from "./orders.schema.js";

export const ordersRouter = Router();

ordersRouter.post(
	"/api/v1/buyer/orders",
	requireAuth,
	requireBuyer,
	validate("body", createOrderSchema),
	handleCreateOrder,
);

ordersRouter.get(
	"/api/v1/buyer/orders",
	requireAuth,
	requireBuyer,
	validate("query", getOrdersQuerySchema),
	handleGetOrders,
);

ordersRouter.get(
	"/api/v1/buyer/orders/:id",
	requireAuth,
	requireBuyer,
	handleGetOrderById,
);
