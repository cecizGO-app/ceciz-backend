import type { NextFunction, Request, Response } from "express";
import { requireRole } from "./requireRole.js";

/**
 * Shorthand middleware: only allow users with role BUYER.
 */
export const requireBuyer = requireRole(["BUYER"]);
