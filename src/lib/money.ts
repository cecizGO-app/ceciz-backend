export type DecimalLike = { toString(): string } | number;

/**
 * Converts a Prisma Decimal or number to integer rupiah.
 * All monetary values are stored and sent as integer rupiah (no float).
 */
export function toRupiah(value: DecimalLike | null | undefined): number {
	if (value === null || value === undefined) return 0;
	return Math.round(Number(value));
}

/**
 * Format integer rupiah to display string (IDR)
 */
export function formatRupiah(amount: number): string {
	return `Rp ${amount.toLocaleString("id-ID")}`;
}
