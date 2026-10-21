import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: [
		"http://localhost:3000",
		"http://localhost:5173",
		process.env.FRONTEND_ORIGIN || "",
	].filter(Boolean),
	user: {
		additionalFields: {
			role: {
				type: ["OWNER", "STAFF", "BUYER"] as const,
				required: true,
				defaultValue: "BUYER",
				input: false,
			},
			contact: {
				type: "string",
				required: false,
			},
			address: {
				type: "string",
				required: false,
			},
			isOnboarded: {
				type: "boolean",
				required: false,
				defaultValue: false,
				input: false,
			},
			isActive: {
				type: "boolean",
				required: false,
				defaultValue: true,
				input: false,
			},
			idLine: {
				type: "string",
				required: false,
			},
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
	},
});
