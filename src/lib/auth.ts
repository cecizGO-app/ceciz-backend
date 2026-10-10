import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	trustedOrigins: ["http://localhost:3000", "http://localhost:5173"],
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
			isActive: {
				type: "boolean",
				required: false,
				defaultValue: true,
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
