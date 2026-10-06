import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaNeon({
	connectionString: databaseUrl,
});

export const prisma = new PrismaClient({ adapter });
