import type { Role } from "../generated/prisma/enums.js.js";
import type { auth } from "../lib/auth.js";

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
