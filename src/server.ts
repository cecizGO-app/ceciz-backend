import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { auth } from "@/lib/auth";
import { router as batchRouter } from "@/routes/batch.routes";

const app = express();
const port = 3005;

app.use(
	cors({
		origin: ["http://localhost:3000", "http://localhost:5173"],
		credentials: true,
	}),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(batchRouter);

app.use(express.json());

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
