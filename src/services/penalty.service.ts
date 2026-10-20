/**
 * penalty.service.ts
 *
 * Pure functions for penalty calculation.
 * All amounts in integer rupiah.
 * Days counted in Asia/Jakarta timezone (WIB).
 */

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

/**
 * Get today's date as a calendar day number in WIB timezone.
 * Returns midnight UTC equivalent of WIB midnight.
 */
export function toWibDay(date: Date): Date {
	const wibMs = date.getTime() + WIB_OFFSET_MS;
	const wibDate = new Date(wibMs);
	// Reset to WIB midnight
	return new Date(
		Date.UTC(wibDate.getUTCFullYear(), wibDate.getUTCMonth(), wibDate.getUTCDate()),
	);
}

/**
 * Calculate how many calendar days (WIB) past the deadline.
 * Returns 0 if not overdue.
 */
export function calcOverdueDays(deadline: Date, now: Date = new Date()): number {
	const deadlineDay = toWibDay(deadline);
	const nowDay = toWibDay(now);

	if (nowDay <= deadlineDay) return 0;

	const diffMs = nowDay.getTime() - deadlineDay.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate penalty amount in integer rupiah.
 *
 * @param deadline - Payment deadline
 * @param penaltyPerDay - Penalty per day (from settings), integer rupiah
 * @param waived - If true, return 0 (admin waived penalty)
 * @param now - Current time (injectable for testing)
 */
export function calcPenalty(
	deadline: Date,
	penaltyPerDay: number,
	waived = false,
	now: Date = new Date(),
): number {
	if (waived) return 0;
	const days = calcOverdueDays(deadline, now);
	return days * penaltyPerDay;
}
