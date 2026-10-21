import { z } from "zod";

export const updateProfileSchema = z
	.object({
		name: z.string().min(1).max(100).optional(),
		contact: z.string().max(100).optional().nullable(),
		address: z.string().max(500).optional().nullable(),
		// Reject email if sent
		email: z.undefined({ message: "Email tidak dapat diubah" }).optional(),
	})
	.strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
