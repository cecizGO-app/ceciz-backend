import "dotenv/config";
import { apiReference } from "@scalar/express-api-reference";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { openApiSpec } from "./docs/openapi.js";
import { auth } from "./lib/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { batchesRouter } from "./modules/admin/batches/batches.routes.js";
import { paymentsRouter } from "./modules/admin/payments/payments.routes.js";
import { trackingRouter } from "./modules/admin/tracking/tracking.routes.js";

const app: Express = express();
const port = process.env.PORT || 3005;

const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:5173",
	process.env.FRONTEND_URL,
].filter(Boolean) as string[];

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

app.use(batchesRouter);
app.use(paymentsRouter);
app.use(trackingRouter);

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
