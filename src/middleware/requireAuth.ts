import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../lib/auth.js";

export const requireAuth = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});

		if (!session) {
			return res.status(401).json({
				message: "Unauthorized: Silahkan login terlebih dahulu",
			});
		}

		req.user = session.user;
		req.session = session.session;
		next();
	} catch {
		return res.status(500).json({
			message: "Internal Server Error",
		});
	}
};
