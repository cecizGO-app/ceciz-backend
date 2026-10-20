import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBuyer } from "../../../middleware/requireBuyer.js";
import { validate } from "../../../middleware/validate.js";
import {
	handleGetInvoiceById,
	handleGetInvoices,
} from "./invoices.controller.js";
import { getInvoicesQuerySchema } from "./invoices.schema.js";

export const invoicesRouter = Router();

invoicesRouter.get(
	"/api/v1/buyer/invoices",
	requireAuth,
	requireBuyer,
	validate("query", getInvoicesQuerySchema),
	handleGetInvoices,
);

invoicesRouter.get(
	"/api/v1/buyer/invoices/:id",
	requireAuth,
	requireBuyer,
	handleGetInvoiceById,
);
