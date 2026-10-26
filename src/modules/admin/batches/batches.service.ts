import type { Prisma } from "@/generated/prisma/client";
import {
	BatchStatus,
	CountryCode,
	InvoiceStatus,
	NotificationChannel,
	NotificationType,
	OrderStatus,
	Role,
	TrackingStatus,
} from "@/generated/prisma/enums";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type {
	BatchItemInput,
	CreateBatchInput,
	GetAdminUsersQueryInput,
	GetBatchQueryInput,
	UpdateBatchInput,
} from "./batches.schema.js";

const DEFAULT_DAILY_RATE: Record<string, number> = {
	CH: 2250,
	KR: 11.8,
	TH: 450,
	JP: 108,
	INA: 1,
};

const DEFAULT_FEE_REKAP_TIERS = [
	{ min_pcs: 1, max_pcs: 1, fee: 2000, label: "Tier 1 pc" },
	{ min_pcs: 2, max_pcs: 5, fee: 4000, label: "Tier 2-5 pcs" },
	{ min_pcs: 6, max_pcs: 10, fee: 6000, label: "Tier 6-10 pcs" },
	{ min_pcs: 11, max_pcs: 15, fee: 8000, label: "Tier 11-15 pcs" },
	{ min_pcs: 16, max_pcs: 20, fee: 11000, label: "Tier 16-20 pcs" },
	{ min_pcs: 21, max_pcs: 25, fee: 14000, label: "Tier 21-25 pcs" },
	{ min_pcs: 26, max_pcs: 30, fee: 17000, label: "Tier 26-30 pcs" },
	{ min_pcs: 31, max_pcs: 35, fee: 21000, label: "Tier 31-35 pcs" },
	{ min_pcs: 36, max_pcs: 40, fee: 25000, label: "Tier 36-40 pcs" },
	{ min_pcs: 41, max_pcs: 45, fee: 29000, label: "Tier 41-45 pcs" },
	{ min_pcs: 46, max_pcs: 50, fee: 33000, label: "Tier 46-50 pcs" },
	{ min_pcs: 51, max_pcs: 55, fee: 37000, label: "Tier 51-55 pcs" },
	{ min_pcs: 56, max_pcs: 60, fee: 41000, label: "Tier 56-60 pcs" },
];

export function calculateTieredFeeRekap(totalPcs: number): number {
	if (totalPcs <= 0) return 0;
	const matched = DEFAULT_FEE_REKAP_TIERS.find(
		(tier) => totalPcs >= tier.min_pcs && totalPcs <= tier.max_pcs,
	);
	if (matched) return matched.fee;
	// Untuk > 60 pcs, gunakan kelipatan +Rp4.000 tiap 5 pcs di atas 60
	const extraBlocks = Math.ceil((totalPcs - 60) / 5);
	return 41000 + extraBlocks * 4000;
}

function computeBatchCalculations(params: {
	countryCode: CountryCode;
	rateHarian?: number | null | undefined;
	shippingFee?: number | null | undefined;
	feeWh?: number | null | undefined;
	feeProxy?: number | null | undefined;
	feeGo: number;
	feeRekap: number;
	feeNyelem: number;
	items: BatchItemInput[];
}) {
	const {
		countryCode,
		rateHarian,
		shippingFee,
		feeWh,
		feeProxy,
		feeGo,
		feeRekap,
		feeNyelem,
		items,
	} = params;

	const totalPcs = items.reduce((sum, item) => sum + (item.pcs || 1), 0);
	const resolvedFeeRekap =
		feeRekap > 0 ? feeRekap : calculateTieredFeeRekap(totalPcs);

	const rate =
		countryCode === CountryCode.INA
			? 1
			: (rateHarian ?? DEFAULT_DAILY_RATE[countryCode] ?? 1);

	// Khusus Korea (KR): format input harga dibagi 10.000 (misal 0.2 = 2.000 Won)
	const krMultiplier = countryCode === CountryCode.KR ? 10000 : 1;

	const totalHargaAsli = items.reduce(
		(sum, item) => sum + item.hargaAsli * (item.pcs || 1),
		0,
	);

	// 1. Konversi Barang & Ongkir ke IDR
	const baseIdr = totalHargaAsli * krMultiplier * rate;
	const whAndProxyIdr = (feeWh ?? 0) + (feeProxy ?? 0);

	// Untuk INA, shippingFee / feeWh / feeProxy merepresentasikan "Harga CO Shopee dari Seller"
	const shippingIdr =
		countryCode === CountryCode.INA
			? (shippingFee ?? 0)
			: (shippingFee ?? 0) * krMultiplier * rate;

	// 2. Subtotal TF Seller (Modal Riil Keluar)
	const computedHargaTfSeller = baseIdr + shippingIdr + whAndProxyIdr;

	// 3. Perhitungan Harga Bersih per Buyer & Ringkasan Finansial per Negara
	if (countryCode === CountryCode.JP) {
		// Kasus 4: Jepang (JP) -> Harga jual manual oleh admin, Fee Nyelem flat total 1 batch
		const computedItems = items.map((item) => {
			const pcs = item.pcs || 1;
			const manualPrice = item.hargaJualPerBuyer ?? item.hargaPerBuyer ?? null;
			return {
				...item,
				pcs,
				feeNyelem: item.feeNyelem ?? null,
				hargaPerBuyer: item.hargaPerBuyer ?? manualPrice,
				hargaJualPerBuyer: manualPrice,
			};
		});

		const computedHargaTotal = computedItems.reduce(
			(sum, item) =>
				sum + (item.hargaJualPerBuyer ?? item.hargaPerBuyer ?? 0) * item.pcs,
			0,
		);
		const computedSelisihHarga = computedHargaTotal - computedHargaTfSeller;
		const computedLabaBersih =
			computedSelisihHarga - feeNyelem - resolvedFeeRekap;

		return {
			resolvedFeeRekap,
			computedItems,
			computedHargaTotal: items.length > 0 ? computedHargaTotal : null,
			computedHargaTfSeller: items.length > 0 ? computedHargaTfSeller : null,
			computedSelisihHarga: items.length > 0 ? computedSelisihHarga : null,
			computedLabaBersih: items.length > 0 ? computedLabaBersih : null,
		};
	}

	if (countryCode === CountryCode.INA) {
		// Kasus 5: Indonesia (INA) -> Tagihan Buyer = Harga Asli + Fee GO per pc
		const resolvedFeeGoTotal = feeGo > 0 ? feeGo : 2000 * totalPcs;
		const feeGoPerPc = totalPcs > 0 ? resolvedFeeGoTotal / totalPcs : 2000;

		const computedItems = items.map((item) => {
			const pcs = item.pcs || 1;
			const defaultUnitBuyerIdr = Math.round(item.hargaAsli + feeGoPerPc);
			return {
				...item,
				pcs,
				feeNyelem: item.feeNyelem ?? null,
				hargaPerBuyer: item.hargaPerBuyer ?? defaultUnitBuyerIdr,
				hargaJualPerBuyer: item.hargaJualPerBuyer ?? null,
			};
		});

		const computedHargaTotal = computedItems.reduce(
			(sum, item) => sum + (item.hargaPerBuyer ?? 0) * item.pcs,
			0,
		);
		const computedSelisihHarga = computedHargaTotal - computedHargaTfSeller;
		const computedLabaBersih =
			computedSelisihHarga - feeNyelem - resolvedFeeRekap;

		return {
			resolvedFeeRekap,
			computedItems,
			computedHargaTotal: items.length > 0 ? computedHargaTotal : null,
			computedHargaTfSeller: items.length > 0 ? computedHargaTfSeller : null,
			computedSelisihHarga: items.length > 0 ? computedSelisihHarga : null,
			computedLabaBersih: items.length > 0 ? computedLabaBersih : null,
		};
	}

	// Kasus 1, 2, 3: China (CH), Korea (KR), Thailand (TH)
	// Fee Keseluruhan Batch = Fee WH + Fee Proxy + Fee GO + Fee Rekap
	// Overhead per Pc = (Ongkir IDR + Fee Keseluruhan) / Total Qty + Fee Nyelem per pc
	const feeKeseluruhanBatch = whAndProxyIdr + feeGo + resolvedFeeRekap;
	const sharedOverheadPerPc =
		totalPcs > 0 ? (shippingIdr + feeKeseluruhanBatch) / totalPcs : 0;
	const feeNyelemTotal = feeNyelem * totalPcs;

	const computedItems = items.map((item) => {
		const pcs = item.pcs || 1;
		const itemFeeNyelemPerPc = item.feeNyelem ?? feeNyelem;
		const defaultUnitBuyerIdr = Math.round(
			item.hargaAsli * krMultiplier * rate +
				sharedOverheadPerPc +
				itemFeeNyelemPerPc,
		);
		return {
			...item,
			pcs,
			feeNyelem: item.feeNyelem ?? null,
			hargaPerBuyer: item.hargaPerBuyer ?? defaultUnitBuyerIdr,
			hargaJualPerBuyer: item.hargaJualPerBuyer ?? null,
		};
	});

	const computedHargaTotal = computedItems.reduce(
		(sum, item) => sum + (item.hargaPerBuyer ?? 0) * item.pcs,
		0,
	);
	const computedSelisihHarga = computedHargaTotal - computedHargaTfSeller;
	const computedLabaBersih =
		computedSelisihHarga - resolvedFeeRekap - feeNyelemTotal;

	return {
		resolvedFeeRekap,
		computedItems,
		computedHargaTotal: items.length > 0 ? computedHargaTotal : null,
		computedHargaTfSeller: items.length > 0 ? computedHargaTfSeller : null,
		computedSelisihHarga: items.length > 0 ? computedSelisihHarga : null,
		computedLabaBersih: items.length > 0 ? computedLabaBersih : null,
	};
}

async function resolveAdminNyelemId(
	tx: Prisma.TransactionClient,
	adminNyelemId?: string | null,
): Promise<string | null> {
	if (!adminNyelemId?.trim()) return null;
	const trimmed = adminNyelemId.trim();
	const existing = await tx.user.findUnique({
		where: { id: trimmed },
		select: { id: true },
	});
	return existing ? existing.id : null;
}

async function ensureBuyersExist(
	tx: Prisma.TransactionClient,
	items: Array<{ buyerId: string; buyerName?: string | undefined }>,
) {
	const uniqueBuyers = new Map<string, string>();
	for (const item of items) {
		if (item.buyerId) {
			uniqueBuyers.set(item.buyerId, item.buyerName || item.buyerId);
		}
	}

	for (const [buyerId, buyerName] of uniqueBuyers.entries()) {
		const existing = await tx.user.findUnique({
			where: { id: buyerId },
			select: { id: true },
		});
		if (!existing) {
			const safeSlug = buyerId
				.toLowerCase()
				.replace(/[^a-z0-9._-]/g, "_")
				.slice(0, 40);
			await tx.user.create({
				data: {
					id: buyerId,
					name: buyerName,
					email: `${safeSlug}_${Date.now()}@buyer.ceciz.local`,
					role: Role.BUYER,
					isOnboarded: true,
					isActive: true,
				},
			});
		}
	}
}

async function syncOrdersAndInvoicesForBatch(
	tx: Prisma.TransactionClient,
	batch: {
		id: string;
		title: string;
		countryCode: CountryCode;
	},
	items: Array<{
		buyerId: string;
		description: string;
		pcs: number;
		hargaPerBuyer: number | null;
		hargaJualPerBuyer: number | null;
	}>,
) {
	if (items.length === 0) return;

	const settings = await tx.setting.findUnique({
		where: { id: "singleton" },
		select: { deadlineBatchHours: true },
	});
	const deadlineHours = settings?.deadlineBatchHours ?? 24;
	const deadlinePayment = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);
	const isJp = batch.countryCode === CountryCode.JP;

	// Group items by buyerId
	const itemsByBuyer = new Map<string, typeof items>();
	for (const item of items) {
		const list = itemsByBuyer.get(item.buyerId) ?? [];
		list.push(item);
		itemsByBuyer.set(item.buyerId, list);
	}

	for (const [buyerId, buyerItems] of itemsByBuyer.entries()) {
		const totalQty = buyerItems.reduce((sum, i) => sum + (i.pcs || 1), 0);
		const totalAmount = buyerItems.reduce((sum, i) => {
			const unitPrice = isJp
				? Number(i.hargaJualPerBuyer ?? i.hargaPerBuyer ?? 0)
				: Number(i.hargaPerBuyer ?? 0);
			return sum + unitPrice * (i.pcs || 1);
		}, 0);

		const itemDetail = buyerItems.map((i) => ({
			item_name: i.description,
			qty: i.pcs || 1,
			harga_per_buyer: isJp
				? Number(i.hargaJualPerBuyer ?? i.hargaPerBuyer ?? 0)
				: Number(i.hargaPerBuyer ?? 0),
		}));

		const existingOrder = await tx.order.findFirst({
			where: { batchId: batch.id, buyerId },
		});

		if (existingOrder) {
			await tx.order.update({
				where: { id: existingOrder.id },
				data: { itemQty: totalQty },
			});
		} else {
			await tx.order.create({
				data: {
					batchId: batch.id,
					buyerId,
					itemQty: totalQty,
					orderStatus: OrderStatus.CONFIRMED,
				},
			});
		}

		const existingInvoice = await tx.invoice.findFirst({
			where: { batchId: batch.id, buyerId },
			include: {
				payments: {
					where: { verificationStatus: "APPROVED" },
					select: { id: true },
				},
			},
		});

		if (existingInvoice) {
			if (existingInvoice.payments.length === 0) {
				await tx.invoice.update({
					where: { id: existingInvoice.id },
					data: {
						totalAmount,
						itemDetail,
					},
				});
			}
		} else {
			const invoice = await tx.invoice.create({
				data: {
					buyerId,
					batchId: batch.id,
					totalAmount,
					itemDetail,
					invoiceStatus: InvoiceStatus.UNPAID,
					deadlinePayment,
				},
			});

			await tx.notification.create({
				data: {
					buyerId,
					channel: NotificationChannel.IN_APP,
					type: NotificationType.INVOICE_NEW,
					title: "Invoice Baru",
					body: `Tagihan batch ${batch.title} sebesar Rp ${totalAmount.toLocaleString("id-ID")} telah dibuat.`,
					triggeredByEvent: "BATCH_CREATED",
					referenceId: invoice.id,
				},
			});
		}
	}
}

export async function createBatch(input: CreateBatchInput) {
	const duplicate = await prisma.batch.findUnique({
		where: {
			countryCode_batchNumber: {
				countryCode: input.countryCode,
				batchNumber: input.batchNumber,
			},
		},
		select: { id: true },
	});

	if (duplicate) {
		throw AppError.conflict(
			"CONFLICT",
			`Batch ${input.countryCode}-${String(input.batchNumber).padStart(3, "0")} sudah terdaftar`,
		);
	}

	const {
		resolvedFeeRekap,
		computedItems,
		computedHargaTotal,
		computedHargaTfSeller,
		computedSelisihHarga,
		computedLabaBersih,
	} = computeBatchCalculations({
		countryCode: input.countryCode,
		rateHarian: input.rateHarian,
		shippingFee: input.shippingFee,
		feeWh: input.feeWh,
		feeProxy: input.feeProxy,
		feeGo: input.feeGo,
		feeRekap: input.feeRekap,
		feeNyelem: input.feeNyelem,
		items: input.items ?? [],
	});

	return prisma.$transaction(async (tx) => {
		const validAdminNyelemId = await resolveAdminNyelemId(
			tx,
			input.adminNyelemId,
		);

		if (computedItems.length > 0) {
			await ensureBuyersExist(tx, computedItems);
		}

		const newBatch = await tx.batch.create({
			data: {
				countryCode: input.countryCode,
				batchNumber: input.batchNumber,
				batchDate: new Date(input.batchDate),
				title: input.title,
				description: input.description ?? null,
				shippingFee: input.shippingFee ?? null,
				feeGo: input.feeGo,
				feeRekap: resolvedFeeRekap,
				feeNyelem: input.feeNyelem,
				rateHarian: input.rateHarian ?? null,
				feeWh: input.feeWh ?? null,
				feeProxy: input.feeProxy ?? null,
				adminNyelemId: validAdminNyelemId,
				proxyCoName: input.proxyCoName ?? null,
				status: input.status ?? BatchStatus.OPEN,
				hargaTotal: input.hargaTotal ?? computedHargaTotal,
				hargaTfSeller: input.hargaTfSeller ?? computedHargaTfSeller,
				selisihHarga: input.selisihHarga ?? computedSelisihHarga,
				labaBersih: input.labaBersih ?? computedLabaBersih,
				tracking: {
					create: {
						countryCode: input.countryCode,
						trackingStatus: TrackingStatus.PO,
						whName: input.whName ?? null,
						resiNumber: [],
					},
				},
				...(computedItems.length > 0 && {
					items: {
						create: computedItems.map((item) => ({
							buyerId: item.buyerId,
							buyerName: item.buyerName ?? null,
							description: item.description,
							hargaAsli: item.hargaAsli,
							pcs: item.pcs,
							feeNyelem: item.feeNyelem ?? null,
							hargaPerBuyer: item.hargaPerBuyer ?? null,
							hargaJualPerBuyer: item.hargaJualPerBuyer ?? null,
						})),
					},
				}),
			},
			include: {
				adminNyelem: {
					select: {
						id: true,
						name: true,
					},
				},
				items: true,
				tracking: true,
			},
		});

		if (computedItems.length > 0) {
			await syncOrdersAndInvoicesForBatch(tx, newBatch, computedItems);
		}

		return newBatch;
	});
}

export async function updateBatch(id: string, input: UpdateBatchInput) {
	const existingBatch = await prisma.batch.findUnique({
		where: { id },
		include: { items: true, tracking: true },
	});

	if (!existingBatch) {
		throw AppError.notFound("Batch tidak ditemukan");
	}

	const nextCountryCode = input.countryCode ?? existingBatch.countryCode;
	const nextBatchNumber = input.batchNumber ?? existingBatch.batchNumber;

	if (
		nextCountryCode !== existingBatch.countryCode ||
		nextBatchNumber !== existingBatch.batchNumber
	) {
		const duplicate = await prisma.batch.findUnique({
			where: {
				countryCode_batchNumber: {
					countryCode: nextCountryCode,
					batchNumber: nextBatchNumber,
				},
			},
			select: { id: true },
		});
		if (duplicate && duplicate.id !== id) {
			throw AppError.conflict(
				"CONFLICT",
				`Batch ${nextCountryCode}-${String(nextBatchNumber).padStart(3, "0")} sudah terdaftar`,
			);
		}
	}

	return prisma.$transaction(async (tx) => {
		const validAdminNyelemId =
			input.adminNyelemId !== undefined
				? await resolveAdminNyelemId(tx, input.adminNyelemId)
				: undefined;

		let computedFields: ReturnType<typeof computeBatchCalculations> | null =
			null;

		if (input.items !== undefined) {
			computedFields = computeBatchCalculations({
				countryCode: nextCountryCode,
				rateHarian:
					input.rateHarian !== undefined
						? input.rateHarian
						: existingBatch.rateHarian !== null
							? Number(existingBatch.rateHarian)
							: null,
				shippingFee:
					input.shippingFee !== undefined
						? input.shippingFee
						: existingBatch.shippingFee !== null
							? Number(existingBatch.shippingFee)
							: null,
				feeWh:
					input.feeWh !== undefined
						? input.feeWh
						: existingBatch.feeWh !== null
							? Number(existingBatch.feeWh)
							: null,
				feeProxy:
					input.feeProxy !== undefined
						? input.feeProxy
						: existingBatch.feeProxy !== null
							? Number(existingBatch.feeProxy)
							: null,
				feeGo:
					input.feeGo !== undefined ? input.feeGo : Number(existingBatch.feeGo),
				feeRekap:
					input.feeRekap !== undefined
						? input.feeRekap
						: Number(existingBatch.feeRekap),
				feeNyelem:
					input.feeNyelem !== undefined
						? input.feeNyelem
						: Number(existingBatch.feeNyelem),
				items: input.items,
			});

			if (computedFields.computedItems.length > 0) {
				await ensureBuyersExist(tx, computedFields.computedItems);
			}

			await tx.batchItem.deleteMany({ where: { batchId: id } });
			if (computedFields.computedItems.length > 0) {
				await tx.batchItem.createMany({
					data: computedFields.computedItems.map((item) => ({
						batchId: id,
						buyerId: item.buyerId,
						buyerName: item.buyerName ?? null,
						description: item.description,
						hargaAsli: item.hargaAsli,
						pcs: item.pcs,
						feeNyelem: item.feeNyelem ?? null,
						hargaPerBuyer: item.hargaPerBuyer ?? null,
						hargaJualPerBuyer: item.hargaJualPerBuyer ?? null,
					})),
				});
			}
		}

		if (input.whName !== undefined || input.countryCode !== undefined) {
			await tx.tracking.upsert({
				where: { batchId: id },
				update: {
					...(input.countryCode !== undefined && {
						countryCode: input.countryCode,
					}),
					...(input.whName !== undefined && { whName: input.whName }),
				},
				create: {
					batchId: id,
					countryCode: nextCountryCode,
					trackingStatus: TrackingStatus.PO,
					whName: input.whName ?? null,
					resiNumber: [],
				},
			});
		}

		const updatedBatch = await tx.batch.update({
			where: { id },
			data: {
				...(input.countryCode && {
					countryCode: input.countryCode,
				}),
				...(input.batchNumber && {
					batchNumber: input.batchNumber,
				}),
				...(input.batchDate && { batchDate: input.batchDate }),
				...(input.title && { title: input.title }),
				...(input.description !== undefined && {
					description: input.description,
				}),
				...(input.shippingFee !== undefined && {
					shippingFee: input.shippingFee,
				}),
				...(input.feeGo !== undefined && {
					feeGo: input.feeGo,
				}),
				...(input.feeRekap !== undefined && {
					feeRekap: input.feeRekap,
				}),
				...(input.feeNyelem !== undefined && {
					feeNyelem: input.feeNyelem,
				}),
				...(input.rateHarian !== undefined && {
					rateHarian: input.rateHarian,
				}),
				...(input.feeWh !== undefined && {
					feeWh: input.feeWh,
				}),
				...(input.feeProxy !== undefined && {
					feeProxy: input.feeProxy,
				}),
				...(validAdminNyelemId !== undefined && {
					adminNyelemId: validAdminNyelemId,
				}),
				...(input.proxyCoName !== undefined && {
					proxyCoName: input.proxyCoName,
				}),
				...(input.status && { status: input.status }),
				...(input.hargaTotal !== undefined
					? { hargaTotal: input.hargaTotal }
					: computedFields
						? { hargaTotal: computedFields.computedHargaTotal }
						: {}),
				...(input.hargaTfSeller !== undefined
					? { hargaTfSeller: input.hargaTfSeller }
					: computedFields
						? { hargaTfSeller: computedFields.computedHargaTfSeller }
						: {}),
				...(input.selisihHarga !== undefined
					? { selisihHarga: input.selisihHarga }
					: computedFields
						? { selisihHarga: computedFields.computedSelisihHarga }
						: {}),
				...(input.labaBersih !== undefined
					? { labaBersih: input.labaBersih }
					: computedFields
						? { labaBersih: computedFields.computedLabaBersih }
						: {}),
			},
			include: {
				adminNyelem: {
					select: {
						id: true,
						name: true,
					},
				},
				items: true,
				tracking: true,
			},
		});

		if (computedFields && computedFields.computedItems.length > 0) {
			await syncOrdersAndInvoicesForBatch(
				tx,
				updatedBatch,
				computedFields.computedItems,
			);
		}

		return updatedBatch;
	});
}

export async function getBatchStats() {
	const [activeBatches, totalPcProcessed, waitingCalculation, archivedBatches] =
		await Promise.all([
			prisma.batch.count({
				where: { status: BatchStatus.OPEN },
			}),
			prisma.batchItem.aggregate({
				_sum: { pcs: true },
				where: { batch: { status: BatchStatus.OPEN } },
			}),
			prisma.batch.count({
				where: {
					tracking: {
						trackingStatus: {
							in: [
								TrackingStatus.ARRIVED_WH_INA,
								TrackingStatus.BISA_DI_CO,
								TrackingStatus.DONE,
							],
						},
					},
					labaBersih: null,
				},
			}),
			prisma.batch.count({
				where: { status: BatchStatus.ARCHIVED },
			}),
		]);

	return {
		totalBatchAktif: activeBatches,
		totalPcDiproses: totalPcProcessed._sum.pcs || 0,
		menungguKalkulasiLaba: waitingCalculation,
		batchDiarsipkan: archivedBatches,
		activeBatches,
		activePcs: totalPcProcessed._sum.pcs || 0,
		waitingCalculation,
		archivedBatches,
	};
}

export async function getBatches(query: GetBatchQueryInput) {
	const andConditions: Prisma.BatchWhereInput[] = [];

	if (query.countryCode) {
		andConditions.push({ countryCode: query.countryCode });
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	} else if (query.includeArchived === false) {
		andConditions.push({ status: { not: BatchStatus.ARCHIVED } });
	}

	if (query.whName) {
		andConditions.push({
			tracking: {
				whName: { contains: query.whName, mode: "insensitive" },
			},
		});
	}

	if (query.search) {
		const searchTrimmed = query.search.trim();
		const orConditions: Prisma.BatchWhereInput[] = [
			{ title: { contains: searchTrimmed, mode: "insensitive" } },
			{ proxyCoName: { contains: searchTrimmed, mode: "insensitive" } },
			{
				tracking: {
					whName: { contains: searchTrimmed, mode: "insensitive" },
				},
			},
		];

		const searchNum = parseInt(searchTrimmed, 10);
		if (!Number.isNaN(searchNum) && /^\d+$/.test(searchTrimmed)) {
			orConditions.push({ batchNumber: searchNum });
		}

		const match = searchTrimmed.match(/^([a-zA-Z]{2,3})[- ]?(\d+)$/);
		if (match?.[1] && match[2]) {
			const country = match[1].toUpperCase() as CountryCode;
			const num = parseInt(match[2], 10);
			if (Object.values(CountryCode).includes(country)) {
				orConditions.push({
					AND: [{ countryCode: country }, { batchNumber: num }],
				});
			}
		}

		andConditions.push({ OR: orConditions });
	}

	const where: Prisma.BatchWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};

	const page = query.page;
	const limit = query.limit;
	const skip = page && limit ? (page - 1) * limit : undefined;
	const take = limit ?? undefined;

	const [batches, total] = await Promise.all([
		prisma.batch.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			...(skip !== undefined && { skip }),
			...(take !== undefined && { take }),
			include: {
				adminNyelem: {
					select: {
						id: true,
						name: true,
					},
				},
				tracking: {
					select: {
						id: true,
						whName: true,
						boxNo: true,
						trackingStatus: true,
					},
				},
				items: {
					select: {
						id: true,
						pcs: true,
						buyerId: true,
						buyerName: true,
					},
				},
				_count: {
					select: {
						items: true,
						orders: true,
					},
				},
			},
		}),
		page && limit ? prisma.batch.count({ where }) : Promise.resolve(undefined),
	]);

	const data = batches.map((batch) => {
		const totalPcs = batch.items.reduce(
			(sum, item) => sum + (item.pcs || 1),
			0,
		);
		const uniqueBuyers = new Set(
			batch.items.map((i) => i.buyerId).filter(Boolean),
		).size;
		return {
			...batch,
			whName: batch.tracking?.whName ?? null,
			totalPcs,
			totalBuyers: uniqueBuyers,
		};
	});

	const pagination =
		page && limit && total !== undefined
			? {
					total,
					page,
					limit,
					totalPages: Math.ceil(total / limit),
				}
			: undefined;

	return { data, pagination };
}

export async function getBatchById(id: string) {
	const batch = await prisma.batch.findUnique({
		where: { id },
		include: {
			adminNyelem: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			items: {
				include: {
					buyer: {
						select: {
							id: true,
							name: true,
							email: true,
							idLine: true,
							contact: true,
						},
					},
				},
			},
			tracking: true,
		},
	});

	if (!batch) throw AppError.notFound("Batch tidak ditemukan");

	return {
		...batch,
		whName: batch.tracking?.whName ?? null,
	};
}

export async function deleteBatch(id: string) {
	const existingBatch = await prisma.batch.findUnique({
		where: { id },
		include: {
			_count: {
				select: {
					items: true,
					orders: true,
				},
			},
		},
	});

	if (!existingBatch) throw AppError.notFound("Batch tidak ditemukan");

	if (existingBatch._count.items > 0 || existingBatch._count.orders > 0) {
		throw AppError.badRequest(
			"Batch tidak dapat dihapus karena sudah ada pesanan. Silahkan ubah status menjadi CLOSED atau ARCHIVED.",
		);
	}

	await prisma.batch.delete({
		where: { id },
	});
}

export async function getAdminUsers(query: GetAdminUsersQueryInput) {
	const users = await prisma.user.findMany({
		where: {
			isActive: true,
			...(query.role && { role: query.role }),
			...(query.search && {
				OR: [
					{ name: { contains: query.search, mode: "insensitive" } },
					{ email: { contains: query.search, mode: "insensitive" } },
					{ idLine: { contains: query.search, mode: "insensitive" } },
				],
			}),
		},
		orderBy: { name: "asc" },
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			idLine: true,
			contact: true,
		},
	});

	return users;
}

export async function getNextBatchNumber(countryCode: CountryCode) {
	const lastBatch = await prisma.batch.findFirst({
		where: { countryCode },
		orderBy: { batchNumber: "desc" },
		select: { batchNumber: true },
	});

	const nextBatchNumber = (lastBatch?.batchNumber ?? 0) + 1;

	return {
		countryCode,
		nextBatchNumber,
		formattedCode: `${countryCode}-${String(nextBatchNumber).padStart(3, "0")}`,
	};
}

export async function getBatchFormOptions() {
	const [buyers, admins, settings, lastBatches] = await Promise.all([
		prisma.user.findMany({
			where: { isActive: true, role: Role.BUYER },
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				email: true,
				idLine: true,
				contact: true,
			},
		}),
		prisma.user.findMany({
			where: { isActive: true, role: { in: [Role.OWNER, Role.STAFF] } },
			orderBy: { name: "asc" },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
			},
		}),
		prisma.setting.findUnique({
			where: { id: "singleton" },
		}),
		prisma.batch.groupBy({
			by: ["countryCode"],
			_max: { batchNumber: true },
		}),
	]);

	const nextBatchNumbers: Record<string, number> = {
		CH: 1,
		KR: 1,
		TH: 1,
		JP: 1,
		INA: 1,
	};

	for (const row of lastBatches) {
		nextBatchNumbers[row.countryCode] = (row._max.batchNumber ?? 0) + 1;
	}

	return {
		buyers,
		admins,
		nextBatchNumbers,
		settings: {
			defaultFeeNyelem: settings ? Number(settings.defaultFeeNyelem) : 2000,
			dailyRate: settings?.dailyRate ?? DEFAULT_DAILY_RATE,
			feeRekapTiers: settings?.feeRekapTiers ?? DEFAULT_FEE_REKAP_TIERS,
			deadlineBatchHours: settings?.deadlineBatchHours ?? 24,
		},
	};
}
