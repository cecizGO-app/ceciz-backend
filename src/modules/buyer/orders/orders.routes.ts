import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreateOrder,
	handleGetOrderById,
	handleGetOrders,
} from "./orders.controller.js";
import { createOrderSchema, getOrdersQuerySchema } from "./orders.schema.js";

export const ordersRouter: Router = Router();

ordersRouter.post(
	"/api/v1/buyer/orders",
	requireAuth,
	requireRole(["BUYER"]),
	validate("body", createOrderSchema),
	handleCreateOrder,
);

ordersRouter.get(
	"/api/v1/buyer/orders",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getOrdersQuerySchema),
	handleGetOrders,
);

ordersRouter.get(
	"/api/v1/buyer/orders/:id",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetOrderById,
);
