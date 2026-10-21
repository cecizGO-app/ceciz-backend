import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleGetInvoiceById,
	handleGetInvoices,
} from "./invoices.controller.js";
import { getInvoicesQuerySchema } from "./invoices.schema.js";

export const invoicesRouter: Router = Router();

invoicesRouter.get(
	"/api/v1/buyer/invoices",
	requireAuth,
	requireRole(["BUYER"]),
	validate("query", getInvoicesQuerySchema),
	handleGetInvoices,
);

invoicesRouter.get(
	"/api/v1/buyer/invoices/:id",
	requireAuth,
	requireRole(["BUYER"]),
	handleGetInvoiceById,
);
