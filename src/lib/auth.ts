import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const isProduction =
	process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

export const auth = betterAuth({
	baseURL: process.env.BETTER_AUTH_URL,
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: [
		process.env.NODE_ENV !== "production" && "http://localhost:5173",
		process.env.FRONTEND_ADMIN_URL,
		process.env.FRONTEND_BUYER_URL,
	]
		.filter(Boolean)
		.flatMap((url) =>
			(url as string)
				.split(",")
				.map((s) => s.trim().replace(/\/+$/, ""))
				.filter(Boolean),
		),
	account: {
		skipStateCookieCheck: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: isProduction ? "none" : "lax",
			secure: isProduction,
		},
	},
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
