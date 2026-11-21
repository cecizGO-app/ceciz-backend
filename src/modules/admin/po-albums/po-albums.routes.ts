import { Router } from "express";
import { requireAuth } from "@/middleware/requireAuth";
import { requireRole } from "@/middleware/requireRole";
import { validate } from "@/middleware/validate";
import {
	handleCreatePoAlbums,
	handleDeletePoAlbum,
	handleGetPoAlbumById,
	handleGetPoAlbumStats,
	handleGetPoAlbums,
	handleUpdatePoAlbum,
} from "./po-albums.controller.js";
import {
	createPoAlbumsSchema,
	getPoAlbumsQuerySchema,
	updatePoAlbumSchema,
} from "./po-albums.schema.js";

export const poAlbumsRouter: Router = Router();

// 1. Stats untuk 4 kartu dashboard PO Album / CO Web
poAlbumsRouter.get(
	"/api/v1/admin/po-albums/stats",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetPoAlbumStats,
);

// 2. List & filter pesanan PO Album
poAlbumsRouter.get(
	"/api/v1/admin/po-albums",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("query", getPoAlbumsQuerySchema),
	handleGetPoAlbums,
);

// 3. Input bulk PO Album / CO Web
poAlbumsRouter.post(
	"/api/v1/admin/po-albums",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", createPoAlbumsSchema),
	handleCreatePoAlbums,
);

// 4. Detail pesanan PO Album
poAlbumsRouter.get(
	"/api/v1/admin/po-albums/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleGetPoAlbumById,
);

// 5. Update pesanan PO Album (DP/FP/CO Status)
poAlbumsRouter.patch(
	"/api/v1/admin/po-albums/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	validate("body", updatePoAlbumSchema),
	handleUpdatePoAlbum,
);

// 6. Hapus pesanan PO Album
poAlbumsRouter.delete(
	"/api/v1/admin/po-albums/:id",
	requireAuth,
	requireRole(["OWNER", "STAFF"]),
	handleDeletePoAlbum,
);
