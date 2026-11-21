import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "@/lib/response";
import type {
	CreatePoAlbumsInput,
	GetPoAlbumsQuery,
	UpdatePoAlbumInput,
} from "./po-albums.schema.js";
import * as poAlbumsService from "./po-albums.service.js";

export async function handleGetPoAlbumStats(_req: Request, res: Response) {
	const result = await poAlbumsService.getPoAlbumStats();
	return sendSuccess(res, result);
}

export async function handleGetPoAlbums(req: Request, res: Response) {
	const query = req.query as unknown as GetPoAlbumsQuery;
	const { data, meta } = await poAlbumsService.getPoAlbums(query);
	return sendSuccess(res, data, 200, meta);
}

export async function handleCreatePoAlbums(req: Request, res: Response) {
	const input = req.body as CreatePoAlbumsInput;
	const result = await poAlbumsService.createPoAlbums(input);
	return sendCreated(res, result);
}

export async function handleGetPoAlbumById(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await poAlbumsService.getPoAlbumById(id);
	return sendSuccess(res, result);
}

export async function handleUpdatePoAlbum(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as UpdatePoAlbumInput;
	const result = await poAlbumsService.updatePoAlbum(id, input);
	return sendSuccess(res, result);
}

export async function handleDeletePoAlbum(req: Request, res: Response) {
	const id = req.params.id as string;
	const result = await poAlbumsService.deletePoAlbum(id);
	return sendSuccess(res, result);
}
