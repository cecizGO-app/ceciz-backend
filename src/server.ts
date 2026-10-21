import "dotenv/config";
import { apiReference } from "@scalar/express-api-reference";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { openApiSpec } from "@/docs/openapi";
import { auth } from "@/lib/auth";
import { errorHandler } from "@/middleware/errorHandler";
import { notFound } from "@/middleware/notFound";
import { batchesRouter as adminBatchesRouter } from "@/modules/admin/batches/batches.routes";
import { paymentsRouter as adminPaymentsRouter } from "@/modules/admin/payments/payments.routes";
import { trackingRouter as adminTrackingRouter } from "@/modules/admin/tracking/tracking.routes";
import { batchesRouter as buyerBatchesRouter } from "@/modules/buyer/batches/batches.routes";
import { invoicesRouter as buyerInvoicesRouter } from "@/modules/buyer/invoices/invoices.routes";
import { ordersRouter as buyerOrdersRouter } from "@/modules/buyer/orders/orders.routes";
import { paymentsRouter as buyerPaymentsRouter } from "@/modules/buyer/payments/payments.routes";
import { profileRouter as buyerProfileRouter } from "@/modules/buyer/profile/profile.routes";
import { taxRouter as buyerTaxRouter } from "@/modules/buyer/tax/tax.routes";
import { contentRouter } from "@/modules/content/content.routes";

const app: Express = express();
const port = process.env.PORT || 3005;

const allowedOrigins = [
	process.env.NODE_ENV !== "production" && "http://localhost:5173",
	process.env.FRONTEND_ADMIN_URL,
	process.env.FRONTEND_BUYER_URL,
]
	.filter(Boolean)
	.flatMap((url) => (url as string).split(",").map((s) => s.trim()));

app.use(
	cors({
		origin: allowedOrigins,
		credentials: true,
	}),
);

app.get("/", (_req, res) => {
	res.json({ status: "ok" });
});

// Scalar API Documentation
if (process.env.ENABLE_DOCS !== "false") {
	app.get("/openapi.json", (_req, res) => {
		res.json(openApiSpec);
	});
	app.use(
		"/reference",
		apiReference({ theme: "purple", spec: { content: openApiSpec } }),
	);
}

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// Admin Routes
app.use(adminBatchesRouter);
app.use(adminPaymentsRouter);
app.use(adminTrackingRouter);

// Buyer Routes
app.use(buyerBatchesRouter);
app.use(buyerInvoicesRouter);
app.use(buyerOrdersRouter);
app.use(buyerPaymentsRouter);
app.use(buyerProfileRouter);
app.use(buyerTaxRouter);

// Content & Public Routes
app.use(contentRouter);

app.use(notFound);
app.use(errorHandler);

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
	app.listen(port, () => {
		console.log(`Server listening on port ${port}`);
		console.log(
			`API Documentation available at http://localhost:${port}/reference`,
		);
	});
}

export default app;
