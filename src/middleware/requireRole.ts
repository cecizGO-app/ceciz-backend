/// <reference path="../types/express.d.ts" />
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@/generated/prisma/enums";

export const requireRole = (allowedRoles: Role[]) => {
	return (req: Request, res: Response, next: NextFunction) => {
		const user = req.user;

		if (!user) {
			return res.status(401).json({
				message: "Unauthorized : Silahkan login terlebih dahulu",
			});
		}

		if (!allowedRoles.includes(user.role)) {
			return res.status(403).json({
				message: "Forbidden: Anda tidak punya akses ke sumber daya ini",
			});
		}

		next();
	};
};
