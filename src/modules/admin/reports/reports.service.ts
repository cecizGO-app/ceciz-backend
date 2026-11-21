import type { Prisma } from "@/generated/prisma/client";
import {
	type CountryCode,
	type PaymentMethod,
	VerificationStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
	CreateAdminFeePeriodInput,
	CreateProfitPeriodInput,
	GetAdminFeesQuery,
	GetPaymentSummaryQuery,
	GetProfitReportQuery,
	UpdateAdminFeePeriodInput,
} from "./reports.schema.js";

function formatBatchCode(countryCode: string, batchNumber: number) {
	return `${countryCode}-${String(batchNumber).padStart(3, "0")}`;
}

function formatProfitPeriod(row: {
	id: string;
	periodName: string;
	startDate: Date;
	endDate: Date;
	batchIds: string[];
	batchCodes: string[];
	totalRevenue: Prisma.Decimal | number | string;
	packingCost: Prisma.Decimal | number | string;
	otherCost: Prisma.Decimal | number | string;
	otherCostNote: string | null;
	totalCost: Prisma.Decimal | number | string;
	netProfit: Prisma.Decimal | number | string;
	adminAPercent: number;
	adminBPercent: number;
	goSavingsPercent: number;
	adminAAmount: Prisma.Decimal | number | string;
	adminBAmount: Prisma.Decimal | number | string;
	goSavingsAmount: Prisma.Decimal | number | string;
	notes: string | null;
	createdAt: Date;
}) {
	return {
		id: row.id,
		periodName: row.periodName,
		startDate: row.startDate,
		endDate: row.endDate,
		batchIds: row.batchIds,
		batchCodes: row.batchCodes,
		totalRevenue: Number(row.totalRevenue),
		packingCost: Number(row.packingCost),
		otherCost: Number(row.otherCost),
		otherCostNote: row.otherCostNote,
		totalCost: Number(row.totalCost),
		netProfit: Number(row.netProfit),
		adminAPercent: row.adminAPercent,
		adminBPercent: row.adminBPercent,
		goSavingsPercent: row.goSavingsPercent,
		adminAAmount: Number(row.adminAAmount),
		adminBAmount: Number(row.adminBAmount),
		goSavingsAmount: Number(row.goSavingsAmount),
		notes: row.notes,
		createdAt: row.createdAt,
	};
}

function formatAdminFeePeriod(row: {
	id: string;
	periodName: string;
	adminName: string;
	batchCount: number;
	batchIds: string[];
	feeNyelem: Prisma.Decimal | number | string;
	feeRekap: Prisma.Decimal | number | string;
	totalFee: Prisma.Decimal | number | string;
	notes: string | null;
	createdAt: Date;
}) {
	return {
		id: row.id,
		periodName: row.periodName,
		adminName: row.adminName,
		batchCount: row.batchCount,
		batchIds: row.batchIds,
		feeNyelem: Number(row.feeNyelem),
		feeRekap: Number(row.feeRekap),
		totalFee: Number(row.totalFee),
		notes: row.notes,
		createdAt: row.createdAt,
	};
}

// ==========================================
// TAB 1: Laba GO
// ==========================================

export async function getProfitReport(query: GetProfitReportQuery) {
	const batchWhere: Prisma.BatchWhereInput = {
		...(query.country && { countryCode: query.country as CountryCode }),
		...(query.batchId && { id: query.batchId }),
		...(query.search && {
			OR: [{ title: { contains: query.search, mode: "insensitive" } }],
		}),
	};

	const periodWhere: Prisma.ProfitPeriodWhereInput = {
		...(query.period && {
			periodName: { contains: query.period, mode: "insensitive" },
		}),
		...(query.search && {
			OR: [
				{ periodName: { contains: query.search, mode: "insensitive" } },
				{ notes: { contains: query.search, mode: "insensitive" } },
			],
		}),
	};

	const [batches, periods] = await Promise.all([
		prisma.batch.findMany({
			where: batchWhere,
			orderBy: { batchDate: "desc" },
			select: {
				id: true,
				countryCode: true,
				batchNumber: true,
				title: true,
				batchDate: true,
				hargaTotal: true,
				hargaTfSeller: true,
				selisihHarga: true,
				labaBersih: true,
			},
		}),
		prisma.profitPeriod.findMany({
			where: periodWhere,
			orderBy: { startDate: "desc" },
		}),
	]);

	const revenue = batches.reduce((s, b) => s + Number(b.hargaTotal ?? 0), 0);
	const cost = batches.reduce((s, b) => s + Number(b.hargaTfSeller ?? 0), 0);
	const grossProfit = batches.reduce(
		(s, b) => s + Number(b.selisihHarga ?? 0),
		0,
	);
	const netProfit = batches.reduce((s, b) => s + Number(b.labaBersih ?? 0), 0);

	// Monthly trend dari ProfitPeriod yang tersimpan
	const monthlyMap = new Map<string, { revenue: number; netProfit: number }>();
	for (const p of periods) {
		const d = new Date(p.startDate);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
		const prev = monthlyMap.get(key) ?? { revenue: 0, netProfit: 0 };
		monthlyMap.set(key, {
			revenue: prev.revenue + Number(p.totalRevenue),
			netProfit: prev.netProfit + Number(p.netProfit),
		});
	}

	const monthlyTrend = [...monthlyMap.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([month, vals]) => ({
			month,
			revenue: vals.revenue,
			netProfit: vals.netProfit,
		}));

	return {
		summary: {
			revenue,
			cost,
			grossProfit,
			netProfit,
		},
		availableBatches: batches.map((b) => ({
			id: b.id,
			code: formatBatchCode(b.countryCode, b.batchNumber),
			title: b.title,
			labaBersih: Number(b.labaBersih ?? 0),
		})),
		periods: periods.map(formatProfitPeriod),
		monthlyTrend,
	};
}

export async function createProfitPeriod(input: CreateProfitPeriodInput) {
	const batches = await prisma.batch.findMany({
		where: { id: { in: input.batchIds } },
		select: {
			id: true,
			countryCode: true,
			batchNumber: true,
			labaBersih: true,
		},
	});

	if (batches.length === 0) {
		throw AppError.notFound("Batch yang dipilih tidak ditemukan");
	}

	const batchCodes = batches.map((b) =>
		formatBatchCode(b.countryCode, b.batchNumber),
	);
	const totalRevenue = batches.reduce(
		(sum, b) => sum + Number(b.labaBersih ?? 0),
		0,
	);
	const totalCost = input.packingCost + input.otherCost;
	const netProfit = totalRevenue - totalCost;

	const distributable = Math.max(netProfit, 0);
	const adminAAmount = Math.round((distributable * input.adminAPercent) / 100);
	const adminBAmount = Math.round((distributable * input.adminBPercent) / 100);
	const goSavingsAmount = Math.round(
		(distributable * input.goSavingsPercent) / 100,
	);

	const created = await prisma.profitPeriod.create({
		data: {
			periodName: input.periodName,
			startDate: input.startDate,
			endDate: input.endDate,
			batchIds: batches.map((b) => b.id),
			batchCodes,
			totalRevenue,
			packingCost: input.packingCost,
			otherCost: input.otherCost,
			otherCostNote: input.otherCostNote ?? null,
			totalCost,
			netProfit,
			adminAPercent: input.adminAPercent,
			adminBPercent: input.adminBPercent,
			goSavingsPercent: input.goSavingsPercent,
			adminAAmount,
			adminBAmount,
			goSavingsAmount,
			notes: input.notes ?? null,
		},
	});

	return formatProfitPeriod(created);
}

export async function deleteProfitPeriod(id: string) {
	const existing = await prisma.profitPeriod.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!existing) {
		throw AppError.notFound("Periode laba tidak ditemukan");
	}
	await prisma.profitPeriod.delete({ where: { id } });
	return { id, deleted: true };
}

// ==========================================
// TAB 2: Gaji Admin (Fee Admin per Periode)
// ==========================================

export async function getAdminFeeReport(query: GetAdminFeesQuery) {
	const and: Prisma.AdminFeePeriodWhereInput[] = [];
	if (query.adminName) {
		and.push({
			adminName: { contains: query.adminName, mode: "insensitive" },
		});
	}
	if (query.period) {
		and.push({
			periodName: { contains: query.period, mode: "insensitive" },
		});
	}
	if (query.search) {
		and.push({
			OR: [
				{ adminName: { contains: query.search, mode: "insensitive" } },
				{ periodName: { contains: query.search, mode: "insensitive" } },
				{ notes: { contains: query.search, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.AdminFeePeriodWhereInput = and.length ? { AND: and } : {};
	const rows = await prisma.adminFeePeriod.findMany({
		where,
		orderBy: { createdAt: "desc" },
	});

	const totalFee = rows.reduce((s, r) => s + Number(r.totalFee), 0);
	const totalBatches = rows.reduce((s, r) => s + r.batchCount, 0);

	return {
		summary: {
			totalFee,
			periodCount: rows.length,
			batchCount: totalBatches,
		},
		items: rows.map(formatAdminFeePeriod),
	};
}

export async function createAdminFeePeriod(input: CreateAdminFeePeriodInput) {
	const batchCount =
		input.batchIds.length > 0 ? input.batchIds.length : input.batchCount;
	const totalFee = input.feeNyelem + input.feeRekap;

	const created = await prisma.adminFeePeriod.create({
		data: {
			periodName: input.periodName,
			adminName: input.adminName,
			batchCount,
			batchIds: input.batchIds,
			feeNyelem: input.feeNyelem,
			feeRekap: input.feeRekap,
			totalFee,
			notes: input.notes ?? null,
		},
	});

	return formatAdminFeePeriod(created);
}

export async function updateAdminFeePeriod(
	id: string,
	input: UpdateAdminFeePeriodInput,
) {
	const existing = await prisma.adminFeePeriod.findUnique({
		where: { id },
		select: { id: true, feeNyelem: true, feeRekap: true },
	});
	if (!existing) {
		throw AppError.notFound("Data fee admin tidak ditemukan");
	}

	const nextNyelem = input.feeNyelem ?? Number(existing.feeNyelem);
	const nextRekap = input.feeRekap ?? Number(existing.feeRekap);
	const nextTotal = nextNyelem + nextRekap;

	const updated = await prisma.adminFeePeriod.update({
		where: { id },
		data: {
			...(input.periodName !== undefined && { periodName: input.periodName }),
			...(input.adminName !== undefined && { adminName: input.adminName }),
			...(input.batchCount !== undefined && { batchCount: input.batchCount }),
			...(input.batchIds !== undefined && { batchIds: input.batchIds }),
			...(input.feeNyelem !== undefined && { feeNyelem: input.feeNyelem }),
			...(input.feeRekap !== undefined && { feeRekap: input.feeRekap }),
			...((input.feeNyelem !== undefined || input.feeRekap !== undefined) && {
				totalFee: nextTotal,
			}),
			...(input.notes !== undefined && { notes: input.notes }),
		},
	});

	return formatAdminFeePeriod(updated);
}

export async function deleteAdminFeePeriod(id: string) {
	const existing = await prisma.adminFeePeriod.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!existing) {
		throw AppError.notFound("Data fee admin tidak ditemukan");
	}
	await prisma.adminFeePeriod.delete({ where: { id } });
	return { id, deleted: true };
}

// ==========================================
// TAB 3: Rekap Pembayaran
// ==========================================

export async function getPaymentSummaryReport(query: GetPaymentSummaryQuery) {
	const [batchPayments, taxPayments] = await Promise.all([
		prisma.payment.findMany({
			where: { verificationStatus: VerificationStatus.APPROVED },
			select: {
				paymentMethod: true,
				amount: true,
				paymentDate: true,
				createdAt: true,
			},
		}),
		prisma.taxPayment.findMany({
			where: { taxVerificationStatus: VerificationStatus.APPROVED },
			select: {
				paymentMethod: true,
				amount: true,
				paymentDate: true,
				createdAt: true,
			},
		}),
	]);

	const allPayments = [...batchPayments, ...taxPayments];
	const methodMap = new Map<
		PaymentMethod,
		{ count: number; totalAmount: number; lastPaymentAt: Date | null }
	>();

	for (const p of allPayments) {
		const prev = methodMap.get(p.paymentMethod) ?? {
			count: 0,
			totalAmount: 0,
			lastPaymentAt: null,
		};
		const pDate = p.paymentDate ?? p.createdAt;
		const lastPaymentAt =
			!prev.lastPaymentAt || pDate > prev.lastPaymentAt
				? pDate
				: prev.lastPaymentAt;

		methodMap.set(p.paymentMethod, {
			count: prev.count + 1,
			totalAmount: prev.totalAmount + Number(p.amount),
			lastPaymentAt,
		});
	}

	const grandTotalAmount = [...methodMap.values()].reduce(
		(s, m) => s + m.totalAmount,
		0,
	);
	const grandTotalCount = [...methodMap.values()].reduce(
		(s, m) => s + m.count,
		0,
	);

	let methods = [...methodMap.entries()].map(([method, stats]) => ({
		paymentMethod: method,
		count: stats.count,
		totalAmount: stats.totalAmount,
		sharePercent:
			grandTotalAmount > 0
				? Math.round((stats.totalAmount / grandTotalAmount) * 100)
				: 0,
		lastPaymentAt: stats.lastPaymentAt,
	}));

	if (query.search) {
		const s = query.search.toLowerCase();
		methods = methods.filter((m) => m.paymentMethod.toLowerCase().includes(s));
	}

	methods.sort((a, b) => b.totalAmount - a.totalAmount);

	return {
		methods,
		total: {
			count: grandTotalCount,
			totalAmount: grandTotalAmount,
			sharePercent: grandTotalAmount > 0 ? 100 : 0,
		},
	};
}
