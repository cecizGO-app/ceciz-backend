import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { auth } from "@/lib/auth";

const app = express();
const port = 3005;

app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount body-parsing middleware after the Better Auth handler.
app.use(express.json());

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});
