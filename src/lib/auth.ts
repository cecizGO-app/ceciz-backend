import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
				defaultValue: "BUYER",
				input: false, // Mencegah buyer set role sendiri saat sign-up
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
