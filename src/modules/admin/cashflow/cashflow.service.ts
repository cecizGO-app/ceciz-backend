import type { Prisma } from "@/generated/prisma/client";
import { CashflowType, type PaymentMethod } from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { buildMeta, getPaginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import type {
	CreateCashflowInput,
	GetCashflowQuery,
	GetCashflowStatsQuery,
	UpdateCashflowInput,
} from "./cashflow.schema.js";

function formatCashflowRow(row: {
	id: string;
	entryDate: Date;
	description: string;
	amount: Prisma.Decimal | number | string;
	type: CashflowType;
	category: string | null;
	paymentMethod: PaymentMethod | null;
	notes: string | null;
	createdById: string;
	createdBy: { id: string; name: string; role: string };
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		entryDate: row.entryDate,
		type: row.type,
		category: row.category,
		paymentMethod: row.paymentMethod,
		description: row.description,
		notes: row.notes,
		amount: Number(row.amount),
		createdBy: row.createdBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function buildDateFilter(startDate?: Date, endDate?: Date) {
	if (!startDate && !endDate) return undefined;
	const filter: Prisma.DateTimeFilter = {};
	if (startDate) filter.gte = startDate;
	if (endDate) {
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		filter.lte = end;
	}
	return filter;
}

// ==========================================
// 1. Stats (4 Kartu: Saldo, Pemasukan, Pengeluaran, Aktivitas)
// ==========================================

export async function getCashflowStats(query: GetCashflowStatsQuery = {}) {
	const entryDateFilter = buildDateFilter(query.startDate, query.endDate);
	const baseWhere: Prisma.CashflowEntryWhereInput = entryDateFilter
		? { entryDate: entryDateFilter }
		: {};

	const [incomeAgg, expenseAgg, totalCount, categories] = await Promise.all([
		prisma.cashflowEntry.aggregate({
			where: { ...baseWhere, type: CashflowType.INCOME },
			_sum: { amount: true },
		}),
		prisma.cashflowEntry.aggregate({
			where: { ...baseWhere, type: CashflowType.EXPENSE },
			_sum: { amount: true },
		}),
		prisma.cashflowEntry.count({ where: baseWhere }),
		prisma.cashflowEntry.findMany({
			where: { category: { not: null } },
			distinct: ["category"],
			select: { category: true },
			orderBy: { category: "asc" },
		}),
	]);

	const totalIncome = Number(incomeAgg._sum.amount ?? 0);
	const totalExpense = Number(expenseAgg._sum.amount ?? 0);

	return {
		netBalance: totalIncome - totalExpense,
		totalIncome,
		totalExpense,
		totalCount,
		categories: categories
			.map((c) => c.category)
			.filter((c): c is string => Boolean(c)),
	};
}

// ==========================================
// 2. List & Filter
// ==========================================

export async function getCashflowEntries(query: GetCashflowQuery) {
	const { skip, take } = getPaginationArgs(query);

	const and: Prisma.CashflowEntryWhereInput[] = [];
	const entryDateFilter = buildDateFilter(query.startDate, query.endDate);
	if (entryDateFilter) and.push({ entryDate: entryDateFilter });

	if (query.type && query.type !== "ALL") {
		and.push({ type: query.type as CashflowType });
	}
	if (query.category) {
		and.push({ category: { equals: query.category, mode: "insensitive" } });
	}
	if (query.paymentMethod && query.paymentMethod !== "ALL") {
		and.push({ paymentMethod: query.paymentMethod as PaymentMethod });
	}
	if (query.search) {
		and.push({
			OR: [
				{ description: { contains: query.search, mode: "insensitive" } },
				{ category: { contains: query.search, mode: "insensitive" } },
				{ notes: { contains: query.search, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.CashflowEntryWhereInput = and.length ? { AND: and } : {};

	const [rows, total] = await Promise.all([
		prisma.cashflowEntry.findMany({
			where,
			skip,
			take,
			orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
			include: {
				createdBy: { select: { id: true, name: true, role: true } },
			},
		}),
		prisma.cashflowEntry.count({ where }),
	]);

	return {
		data: rows.map(formatCashflowRow),
		meta: buildMeta(total, query.page, query.limit),
	};
}

// ==========================================
// 3. Create
// ==========================================

export async function createCashflowEntry(
	input: CreateCashflowInput,
	adminUserId: string,
) {
	const created = await prisma.cashflowEntry.create({
		data: {
			entryDate: input.entryDate,
			type: input.type,
			amount: input.amount,
			category: input.category,
			paymentMethod: input.paymentMethod ?? null,
			description: input.description,
			notes: input.notes ?? null,
			createdById: adminUserId,
		},
		include: {
			createdBy: { select: { id: true, name: true, role: true } },
		},
	});

	return formatCashflowRow(created);
}

// ==========================================
// 4. Update
// ==========================================

export async function updateCashflowEntry(
	id: string,
	input: UpdateCashflowInput,
) {
	const existing = await prisma.cashflowEntry.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!existing) {
		throw AppError.notFound("Catatan cashflow tidak ditemukan");
	}

	const updated = await prisma.cashflowEntry.update({
		where: { id },
		data: {
			...(input.entryDate !== undefined && { entryDate: input.entryDate }),
			...(input.type !== undefined && { type: input.type }),
			...(input.amount !== undefined && { amount: input.amount }),
			...(input.category !== undefined && { category: input.category }),
			...(input.paymentMethod !== undefined && {
				paymentMethod: input.paymentMethod,
			}),
			...(input.description !== undefined && {
				description: input.description,
			}),
			...(input.notes !== undefined && { notes: input.notes }),
		},
		include: {
			createdBy: { select: { id: true, name: true, role: true } },
		},
	});

	return formatCashflowRow(updated);
}

// ==========================================
// 5. Delete
// ==========================================

export async function deleteCashflowEntry(id: string) {
	const existing = await prisma.cashflowEntry.findUnique({
		where: { id },
		select: { id: true },
	});
	if (!existing) {
		throw AppError.notFound("Catatan cashflow tidak ditemukan");
	}

	await prisma.cashflowEntry.delete({ where: { id } });
	return { id, deleted: true };
}
