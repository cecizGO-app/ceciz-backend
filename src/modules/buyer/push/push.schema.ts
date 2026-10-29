import { z } from "zod";

export const subscribePushSchema = z.object({
	endpoint: z.string().url(),
	p256dh: z.string().min(1),
	auth: z.string().min(1),
	user_agent: z.string().optional(),
});
export type SubscribePushInput = z.infer<typeof subscribePushSchema>;

export const unsubscribePushSchema = z.object({
	endpoint: z.string().url(),
});
export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;
