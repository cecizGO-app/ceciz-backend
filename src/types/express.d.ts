import type { Role } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";

type AuthSession = typeof auth.$Infer.Session;

declare global {
	namespace Express {
		interface Request {
			user?: Omit<AuthSession["user"], "role"> & {
				role: Role;
			};
			session?: AuthSession["session"];
		}
	}
}
