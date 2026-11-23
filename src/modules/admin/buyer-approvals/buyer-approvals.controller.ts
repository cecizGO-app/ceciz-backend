import type { Request, Response } from "express";
import { sendSuccess } from "@/lib/response";
import type {
	BulkVerifyBuyerApprovalsInput,
	GetBuyerApprovalsQueryInput,
	VerifyBuyerApprovalInput,
} from "./buyer-approvals.schema.js";
import * as buyerApprovalsService from "./buyer-approvals.service.js";

export async function handleGetBuyerApprovalStats(
	_req: Request,
	res: Response,
) {
	const result = await buyerApprovalsService.getBuyerApprovalStats();
	return sendSuccess(res, result);
}

export async function handleGetBuyerApprovals(req: Request, res: Response) {
	const query = req.query as unknown as GetBuyerApprovalsQueryInput;
	const { data, pagination } =
		await buyerApprovalsService.getBuyerApprovals(query);
	return sendSuccess(res, data, 200, pagination);
}

export async function handleVerifyBuyerApproval(req: Request, res: Response) {
	const id = req.params.id as string;
	const input = req.body as VerifyBuyerApprovalInput;
	const result = await buyerApprovalsService.verifyBuyerApproval(
		id,
		input,
		req.user?.id,
	);
	return sendSuccess(res, result);
}

export async function handleBulkVerifyBuyerApprovals(
	req: Request,
	res: Response,
) {
	const input = req.body as BulkVerifyBuyerApprovalsInput;
	const result = await buyerApprovalsService.bulkVerifyBuyerApprovals(
		input,
		req.user?.id,
	);
	return sendSuccess(res, result);
}
